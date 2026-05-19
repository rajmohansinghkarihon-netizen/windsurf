package com.docufiy.notes.util

import android.content.Context
import android.graphics.BitmapFactory
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import com.docufiy.notes.data.local.entity.NoteImageEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

data class ParsedWebPage(
    val title: String,
    val description: String,
    val siteName: String,
    val favicon: String?,
    val blocks: List<WebContentBlock>,
    val imageUrls: List<String>,
    val sourceUrl: String,
    val wordCount: Int,
    val estimatedReadTime: Int
)

data class WebContentBlock(
    val type: String,
    val content: String,
    val imageUrl: String? = null,
    val isBold: Boolean = false,
    val fontSize: Float = 16f,
    val isItalic: Boolean = false,
    val linkUrl: String? = null
)

data class DownloadedImage(
    val localPath: String,
    val originalUrl: String,
    val width: Int,
    val height: Int,
    val fileSize: Long
)

object WebPageParser {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    suspend fun fetchAndParse(url: String): Result<ParsedWebPage> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9,hi;q=0.8")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                return@withContext Result.failure(Exception("HTTP ${response.code}: ${response.message}"))
            }

            val contentType = response.header("Content-Type", "")
            if (contentType != null && !contentType.contains("text/html") && !contentType.contains("application/xhtml")) {
                return@withContext Result.failure(Exception("Not an HTML page (Content-Type: $contentType)"))
            }

            val html = response.body?.string() ?: return@withContext Result.failure(Exception("Empty response body"))
            val doc = Jsoup.parse(html, url)

            val parsed = parseDocument(doc, url)
            Result.success(parsed)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun parseDocument(doc: Document, sourceUrl: String): ParsedWebPage {
        // Extract metadata
        val ogTitle = doc.selectFirst("meta[property=og:title]")?.attr("content")
        val ogDescription = doc.selectFirst("meta[property=og:description]")?.attr("content")
            ?: doc.selectFirst("meta[name=description]")?.attr("content") ?: ""
        val ogSiteName = doc.selectFirst("meta[property=og:site_name]")?.attr("content") ?: ""
        val favicon = doc.selectFirst("link[rel~=icon]")?.absUrl("href")

        val title = ogTitle ?: doc.title().ifBlank { "Web Import" }

        // Remove unwanted elements
        doc.select(
            "script, style, nav, header, footer, aside, noscript, iframe, " +
            ".ad, .ads, .advertisement, .social-share, .comments, .sidebar, " +
            ".menu, .navigation, .nav, .cookie-banner, .popup, .modal, " +
            ".related-posts, .recommended, .newsletter, .subscribe, " +
            "[role=navigation], [role=banner], [role=contentinfo], " +
            ".share-buttons, .social-links, #comments, .breadcrumb, " +
            ".pagination, .wp-block-latest-posts, .widget"
        ).remove()

        // Try to find article content with priority
        val article = findArticleContent(doc)

        val blocks = mutableListOf<WebContentBlock>()
        val imageUrls = mutableListOf<String>()

        if (article != null) {
            parseElement(article, blocks, imageUrls, sourceUrl, 0)
        }

        // Filter and clean
        val cleanBlocks = blocks
            .filter { it.content.isNotBlank() || it.imageUrl != null }
            .distinctBy { it.content.take(100) + it.type }

        // Calculate word count and read time
        val wordCount = cleanBlocks.sumOf { it.content.split("\\s+".toRegex()).size }
        val estimatedReadTime = (wordCount / 200).coerceAtLeast(1)

        return ParsedWebPage(
            title = title,
            description = ogDescription,
            siteName = ogSiteName,
            favicon = favicon,
            blocks = cleanBlocks,
            imageUrls = imageUrls.distinct(),
            sourceUrl = sourceUrl,
            wordCount = wordCount,
            estimatedReadTime = estimatedReadTime
        )
    }

    private fun findArticleContent(doc: Document): Element? {
        // Priority-ordered selectors for article content
        val selectors = listOf(
            "article[role=main]",
            "article",
            "[role=main]",
            "main",
            ".post-content",
            ".entry-content",
            ".article-content",
            ".article-body",
            ".story-body",
            ".post-body",
            ".content-body",
            "#article-body",
            "#content",
            ".content",
            ".post"
        )

        for (selector in selectors) {
            val element = doc.selectFirst(selector)
            if (element != null && element.text().length > 100) {
                return element
            }
        }

        // Fallback: find the element with the most <p> tags
        val body = doc.body() ?: return null
        val candidates = body.select("div, section").filter { elem ->
            elem.select("> p").size >= 3 && elem.text().length > 200
        }
        return candidates.maxByOrNull { it.text().length } ?: body
    }

    private fun parseElement(
        element: Element,
        blocks: MutableList<WebContentBlock>,
        imageUrls: MutableList<String>,
        baseUrl: String,
        depth: Int
    ) {
        if (depth > 10) return

        for (child in element.children()) {
            when (child.tagName().lowercase()) {
                "h1" -> addHeading(child, blocks, 28f)
                "h2" -> addHeading(child, blocks, 24f)
                "h3" -> addHeading(child, blocks, 22f)
                "h4" -> addHeading(child, blocks, 20f)
                "h5", "h6" -> addHeading(child, blocks, 18f)

                "p" -> {
                    val text = child.text().trim()
                    if (text.isNotBlank() && text.length > 1) {
                        val hasEmphasis = child.selectFirst("strong, b, em, i") != null
                        blocks.add(WebContentBlock(
                            "text", text,
                            isBold = child.tagName() == "strong" || child.selectFirst("> strong, > b") != null,
                            isItalic = child.selectFirst("> em, > i") != null
                        ))
                    }
                    // Images inside paragraphs
                    extractImages(child, blocks, imageUrls)
                }

                "ul" -> {
                    child.select("> li").forEach { li ->
                        val text = li.text().trim()
                        if (text.isNotBlank()) {
                            blocks.add(WebContentBlock("bullet", text))
                        }
                    }
                }

                "ol" -> {
                    child.select("> li").forEachIndexed { index, li ->
                        val text = li.text().trim()
                        if (text.isNotBlank()) {
                            blocks.add(WebContentBlock("numbered", "${index + 1}. $text"))
                        }
                    }
                }

                "blockquote" -> {
                    val text = child.text().trim()
                    if (text.isNotBlank()) {
                        blocks.add(WebContentBlock("text", "\u201C$text\u201D", isItalic = true))
                    }
                }

                "img" -> addImage(child, blocks, imageUrls)

                "figure" -> {
                    val img = child.selectFirst("img")
                    if (img != null) {
                        addImage(img, blocks, imageUrls)
                    }
                    val caption = child.selectFirst("figcaption")?.text()?.trim()
                    if (!caption.isNullOrBlank()) {
                        blocks.add(WebContentBlock("text", caption, fontSize = 14f, isItalic = true))
                    }
                }

                "pre" -> {
                    val codeText = child.selectFirst("code")?.text()?.trim() ?: child.text().trim()
                    if (codeText.isNotBlank()) {
                        blocks.add(WebContentBlock("text", codeText, fontSize = 14f))
                    }
                }

                "table" -> {
                    val headerRow = child.selectFirst("thead tr")
                    if (headerRow != null) {
                        val headers = headerRow.select("th, td").map { it.text().trim() }
                        if (headers.isNotEmpty()) {
                            blocks.add(WebContentBlock("text", headers.joinToString(" | "), isBold = true))
                        }
                    }
                    child.select("tbody tr, > tr").forEach { row ->
                        val cells = row.select("td, th").map { it.text().trim() }
                        if (cells.isNotEmpty()) {
                            blocks.add(WebContentBlock("text", cells.joinToString(" | ")))
                        }
                    }
                }

                "a" -> {
                    val href = child.absUrl("href")
                    val text = child.text().trim()
                    if (text.isNotBlank() && text.length > 5 && child.children().isEmpty()) {
                        blocks.add(WebContentBlock("text", text, linkUrl = href))
                    }
                }

                "div", "section", "article", "main", "span" -> {
                    val directText = child.ownText().trim()
                    if (directText.isNotBlank() && child.children().isEmpty()) {
                        blocks.add(WebContentBlock("text", directText))
                    } else if (child.children().isNotEmpty()) {
                        parseElement(child, blocks, imageUrls, baseUrl, depth + 1)
                    }
                }
            }
        }
    }

    private fun addHeading(element: Element, blocks: MutableList<WebContentBlock>, fontSize: Float) {
        val text = element.text().trim()
        if (text.isNotBlank()) {
            blocks.add(WebContentBlock("heading", text, isBold = true, fontSize = fontSize))
        }
    }

    private fun addImage(img: Element, blocks: MutableList<WebContentBlock>, imageUrls: MutableList<String>) {
        val src = img.absUrl("src").ifBlank {
            img.attr("data-src").ifBlank {
                img.attr("data-lazy-src").ifBlank {
                    img.attr("srcset").split(",").firstOrNull()?.trim()?.split(" ")?.firstOrNull() ?: ""
                }
            }
        }
        if (src.isNotBlank() && !src.contains("data:image") && !src.contains("1x1") && !src.contains("pixel")) {
            val alt = img.attr("alt").ifBlank { "" }
            blocks.add(WebContentBlock("image", alt, imageUrl = src))
            imageUrls.add(src)
        }
    }

    private fun extractImages(element: Element, blocks: MutableList<WebContentBlock>, imageUrls: MutableList<String>) {
        element.select("img").forEach { img ->
            addImage(img, blocks, imageUrls)
        }
    }

    suspend fun downloadImage(
        context: Context,
        imageUrl: String,
        noteId: Long
    ): DownloadedImage? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(imageUrl)
                .header("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36")
                .build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null

            val bytes = response.body?.bytes() ?: return@withContext null
            if (bytes.size < 1000) return@withContext null // Skip tiny images (likely tracking pixels)

            val dir = File(context.filesDir, "note_images/$noteId")
            dir.mkdirs()
            val ext = when {
                imageUrl.contains(".png", ignoreCase = true) -> "png"
                imageUrl.contains(".webp", ignoreCase = true) -> "webp"
                imageUrl.contains(".gif", ignoreCase = true) -> "gif"
                else -> "jpg"
            }
            val fileName = "web_${System.currentTimeMillis()}.$ext"
            val file = File(dir, fileName)
            FileOutputStream(file).use { it.write(bytes) }

            // Get image dimensions
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, options)

            DownloadedImage(
                localPath = file.absolutePath,
                originalUrl = imageUrl,
                width = options.outWidth.coerceAtLeast(100),
                height = options.outHeight.coerceAtLeast(100),
                fileSize = file.length()
            )
        } catch (e: Exception) {
            null
        }
    }

    suspend fun downloadAllImages(
        context: Context,
        parsed: ParsedWebPage,
        noteId: Long,
        onProgress: (downloaded: Int, total: Int) -> Unit
    ): Map<String, DownloadedImage> = withContext(Dispatchers.IO) {
        val result = mutableMapOf<String, DownloadedImage>()
        val urls = parsed.imageUrls.distinct().take(30)
        urls.forEachIndexed { index, url ->
            val downloaded = downloadImage(context, url, noteId)
            if (downloaded != null) {
                result[url] = downloaded
            }
            onProgress(index + 1, urls.size)
        }
        result
    }

    fun convertToNoteBlocks(
        parsed: ParsedWebPage,
        noteId: Long,
        downloadedImages: Map<String, DownloadedImage> = emptyMap()
    ): List<NoteBlockEntity> {
        val blocks = mutableListOf<NoteBlockEntity>()

        // Source URL block
        blocks.add(
            NoteBlockEntity(
                noteId = noteId,
                type = "text",
                content = "\uD83C\uDF10 Source: ${parsed.sourceUrl}",
                orderIndex = 0,
                fontSize = 12f,
                isItalic = true
            )
        )

        // Site info block
        if (parsed.siteName.isNotBlank()) {
            blocks.add(
                NoteBlockEntity(
                    noteId = noteId,
                    type = "text",
                    content = "${parsed.siteName} \u2022 ${parsed.wordCount} words \u2022 ${parsed.estimatedReadTime} min read",
                    orderIndex = 1,
                    fontSize = 12f
                )
            )
        }

        var orderIndex = if (parsed.siteName.isNotBlank()) 2 else 1

        parsed.blocks.forEach { webBlock ->
            if (webBlock.type == "image" && webBlock.imageUrl != null) {
                val downloaded = downloadedImages[webBlock.imageUrl]
                blocks.add(
                    NoteBlockEntity(
                        noteId = noteId,
                        type = "image",
                        content = webBlock.content,
                        orderIndex = orderIndex,
                        imageUri = downloaded?.localPath,
                        imageWidth = downloaded?.width ?: 0,
                        imageHeight = downloaded?.height ?: 0
                    )
                )
            } else {
                blocks.add(
                    NoteBlockEntity(
                        noteId = noteId,
                        type = webBlock.type,
                        content = webBlock.content,
                        orderIndex = orderIndex,
                        isBold = webBlock.isBold,
                        isItalic = webBlock.isItalic,
                        fontSize = webBlock.fontSize
                    )
                )
            }
            orderIndex++
        }

        return blocks
    }

    fun createNoteImageEntities(
        noteId: Long,
        downloadedImages: Map<String, DownloadedImage>
    ): List<NoteImageEntity> {
        return downloadedImages.values.map { img ->
            NoteImageEntity(
                noteId = noteId,
                localPath = img.localPath,
                originalWidth = img.width,
                originalHeight = img.height,
                displayWidth = img.width,
                displayHeight = img.height,
                fileSize = img.fileSize
            )
        }
    }
}
