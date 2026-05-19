package com.docufiy.notes.util

import android.content.Context
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import org.jsoup.nodes.TextNode
import org.jsoup.select.Elements
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.concurrent.TimeUnit

data class ParsedWebPage(
    val title: String,
    val blocks: List<WebContentBlock>,
    val imageUrls: List<String>,
    val sourceUrl: String
)

data class WebContentBlock(
    val type: String,
    val content: String,
    val imageUrl: String? = null,
    val isBold: Boolean = false,
    val fontSize: Float = 16f
)

object WebPageParser {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    suspend fun fetchAndParse(url: String): Result<ParsedWebPage> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                return@withContext Result.failure(Exception("Failed to fetch: HTTP ${response.code}"))
            }

            val html = response.body?.string() ?: return@withContext Result.failure(Exception("Empty response"))
            val doc = Jsoup.parse(html, url)

            val parsed = parseDocument(doc, url)
            Result.success(parsed)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun parseDocument(doc: Document, sourceUrl: String): ParsedWebPage {
        // Remove unwanted elements
        doc.select("script, style, nav, header, footer, aside, .ad, .ads, .advertisement, " +
                ".social-share, .comments, .sidebar, .menu, .navigation, noscript, iframe").remove()

        val title = doc.title().ifBlank { "Web Import" }

        // Try to find article content
        val article = doc.selectFirst("article") ?: doc.selectFirst("main") ?: doc.selectFirst(".content") ?: doc.selectFirst(".post-content") ?: doc.selectFirst(".entry-content") ?: doc.body()

        val blocks = mutableListOf<WebContentBlock>()
        val imageUrls = mutableListOf<String>()

        if (article != null) {
            parseElement(article, blocks, imageUrls, sourceUrl)
        }

        // Filter out empty blocks and clean up
        val cleanBlocks = blocks.filter { it.content.isNotBlank() || it.imageUrl != null }

        return ParsedWebPage(
            title = title,
            blocks = cleanBlocks,
            imageUrls = imageUrls,
            sourceUrl = sourceUrl
        )
    }

    private fun parseElement(
        element: Element,
        blocks: MutableList<WebContentBlock>,
        imageUrls: MutableList<String>,
        baseUrl: String
    ) {
        for (child in element.children()) {
            when (child.tagName().lowercase()) {
                "h1" -> {
                    val text = child.text().trim()
                    if (text.isNotBlank()) {
                        blocks.add(WebContentBlock("heading", text, isBold = true, fontSize = 24f))
                    }
                }
                "h2" -> {
                    val text = child.text().trim()
                    if (text.isNotBlank()) {
                        blocks.add(WebContentBlock("heading", text, isBold = true, fontSize = 22f))
                    }
                }
                "h3", "h4", "h5", "h6" -> {
                    val text = child.text().trim()
                    if (text.isNotBlank()) {
                        blocks.add(WebContentBlock("heading", text, isBold = true, fontSize = 20f))
                    }
                }
                "p" -> {
                    val text = child.text().trim()
                    if (text.isNotBlank()) {
                        blocks.add(WebContentBlock("text", text))
                    }
                    // Check for images inside paragraphs
                    child.select("img").forEach { img ->
                        val src = img.absUrl("src").ifBlank { img.attr("data-src") }
                        if (src.isNotBlank()) {
                            blocks.add(WebContentBlock("image", "", imageUrl = src))
                            imageUrls.add(src)
                        }
                    }
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
                    child.select("> li").forEach { li ->
                        val text = li.text().trim()
                        if (text.isNotBlank()) {
                            blocks.add(WebContentBlock("numbered", text))
                        }
                    }
                }
                "blockquote" -> {
                    val text = child.text().trim()
                    if (text.isNotBlank()) {
                        blocks.add(WebContentBlock("text", "\u201C$text\u201D"))
                    }
                }
                "img" -> {
                    val src = child.absUrl("src").ifBlank { child.attr("data-src") }
                    if (src.isNotBlank()) {
                        blocks.add(WebContentBlock("image", child.attr("alt"), imageUrl = src))
                        imageUrls.add(src)
                    }
                }
                "figure" -> {
                    val img = child.selectFirst("img")
                    if (img != null) {
                        val src = img.absUrl("src").ifBlank { img.attr("data-src") }
                        val caption = child.selectFirst("figcaption")?.text()?.trim() ?: ""
                        if (src.isNotBlank()) {
                            blocks.add(WebContentBlock("image", caption, imageUrl = src))
                            imageUrls.add(src)
                        }
                    }
                    val figText = child.selectFirst("figcaption")?.text()?.trim()
                    if (!figText.isNullOrBlank()) {
                        blocks.add(WebContentBlock("text", figText))
                    }
                }
                "pre", "code" -> {
                    val text = child.text().trim()
                    if (text.isNotBlank()) {
                        blocks.add(WebContentBlock("text", text))
                    }
                }
                "div", "section", "article", "main" -> {
                    // Check if div has direct text
                    val directText = child.ownText().trim()
                    if (directText.isNotBlank() && child.children().isEmpty()) {
                        blocks.add(WebContentBlock("text", directText))
                    } else {
                        parseElement(child, blocks, imageUrls, baseUrl)
                    }
                }
                "table" -> {
                    val rows = child.select("tr")
                    rows.forEach { row ->
                        val cells = row.select("td, th").map { it.text().trim() }
                        if (cells.isNotEmpty()) {
                            blocks.add(WebContentBlock("text", cells.joinToString(" | ")))
                        }
                    }
                }
            }
        }
    }

    suspend fun downloadImage(
        context: Context,
        imageUrl: String,
        noteId: Long
    ): String? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(imageUrl)
                .build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null

            val bytes = response.body?.bytes() ?: return@withContext null
            val dir = File(context.filesDir, "note_images/$noteId")
            dir.mkdirs()
            val fileName = "web_${System.currentTimeMillis()}.jpg"
            val file = File(dir, fileName)
            FileOutputStream(file).use { it.write(bytes) }
            file.absolutePath
        } catch (e: Exception) {
            null
        }
    }

    fun convertToNoteBlocks(parsed: ParsedWebPage, noteId: Long): List<NoteBlockEntity> {
        val blocks = mutableListOf<NoteBlockEntity>()

        // Source URL block
        blocks.add(
            NoteBlockEntity(
                noteId = noteId,
                type = "text",
                content = "Source: ${parsed.sourceUrl}",
                orderIndex = 0,
                fontSize = 12f
            )
        )

        parsed.blocks.forEachIndexed { index, webBlock ->
            blocks.add(
                NoteBlockEntity(
                    noteId = noteId,
                    type = webBlock.type,
                    content = webBlock.content,
                    orderIndex = index + 1,
                    isBold = webBlock.isBold,
                    fontSize = webBlock.fontSize,
                    imageUri = null // Images downloaded separately
                )
            )
        }

        return blocks
    }
}
