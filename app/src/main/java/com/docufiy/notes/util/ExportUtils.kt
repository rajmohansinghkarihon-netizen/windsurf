package com.docufiy.notes.util

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.docufiy.notes.data.local.entity.NoteBlockEntity
import com.docufiy.notes.data.local.entity.NoteEntity
import java.io.File
import java.io.FileOutputStream

object ExportUtils {

    data class ExportOptions(
        val pageSize: PageSize = PageSize.A4,
        val quality: Int = 100,
        val includeImages: Boolean = true,
        val includeBackground: Boolean = true,
        val backgroundColor: Long = 0xFFFFFFFF
    )

    enum class PageSize(val widthPt: Int, val heightPt: Int) {
        A4(595, 842),
        LETTER(612, 792),
        CUSTOM(720, 1280)
    }

    enum class Resolution(val width: Int, val height: Int) {
        HD(720, 1280),
        FHD(1080, 1920),
        QHD(1440, 2560),
        UHD(2160, 3840)
    }

    fun exportToPdf(
        context: Context,
        note: NoteEntity,
        blocks: List<NoteBlockEntity>,
        options: ExportOptions = ExportOptions()
    ): String? {
        return try {
            val document = PdfDocument()
            val pageWidth = options.pageSize.widthPt
            val pageHeight = options.pageSize.heightPt
            val margin = 40f

            var pageNumber = 1
            var yOffset = margin
            var pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
            var page = document.startPage(pageInfo)
            var canvas = page.canvas

            if (options.includeBackground) {
                canvas.drawColor(options.backgroundColor.toInt())
            }

            // Draw title
            val titlePaint = Paint().apply {
                color = Color.BLACK
                textSize = 24f
                typeface = Typeface.DEFAULT_BOLD
                isAntiAlias = true
            }
            if (note.title.isNotBlank()) {
                canvas.drawText(note.title, margin, yOffset + 24f, titlePaint)
                yOffset += 40f
            }

            val textPaint = Paint().apply {
                color = Color.BLACK
                textSize = 14f
                isAntiAlias = true
            }

            for (block in blocks) {
                val lines = wrapText(block.content, textPaint, pageWidth - 2 * margin)
                val blockHeight = lines.size * (block.fontSize + 4f)

                if (yOffset + blockHeight > pageHeight - margin) {
                    document.finishPage(page)
                    pageNumber++
                    pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                    page = document.startPage(pageInfo)
                    canvas = page.canvas
                    if (options.includeBackground) {
                        canvas.drawColor(options.backgroundColor.toInt())
                    }
                    yOffset = margin
                }

                val paint = Paint().apply {
                    color = block.textColor.toInt()
                    textSize = block.fontSize
                    isAntiAlias = true
                    typeface = when {
                        block.isBold && block.isItalic -> Typeface.DEFAULT_BOLD
                        block.isBold -> Typeface.DEFAULT_BOLD
                        else -> Typeface.DEFAULT
                    }
                    if (block.isUnderline) flags = flags or Paint.UNDERLINE_TEXT_FLAG
                }

                val prefix = when (block.type) {
                    "bullet" -> "• "
                    "numbered" -> "${block.orderIndex + 1}. "
                    else -> ""
                }

                for (line in lines) {
                    val text = if (line == lines.first()) prefix + line else line
                    val x = when (block.alignment) {
                        "center" -> (pageWidth - paint.measureText(text)) / 2f
                        "right" -> pageWidth - margin - paint.measureText(text)
                        else -> margin
                    }
                    canvas.drawText(text, x, yOffset + block.fontSize, paint)
                    yOffset += block.fontSize + 4f
                }

                if (block.type == "image" && options.includeImages && block.imageUri != null) {
                    val bitmap = ImageUtils.loadBitmap(
                        block.imageUri,
                        (pageWidth - 2 * margin).toInt(),
                        (pageHeight / 3).toInt()
                    )
                    if (bitmap != null) {
                        if (yOffset + bitmap.height > pageHeight - margin) {
                            document.finishPage(page)
                            pageNumber++
                            pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                            page = document.startPage(pageInfo)
                            canvas = page.canvas
                            yOffset = margin
                        }
                        canvas.drawBitmap(bitmap, margin, yOffset, null)
                        yOffset += bitmap.height + 10f
                        bitmap.recycle()
                    }
                }

                yOffset += 8f
            }

            document.finishPage(page)

            val fileName = "Docufiy_${note.title.take(20).replace(" ", "_")}_${System.currentTimeMillis()}.pdf"
            val filePath = saveToMediaStore(context, document, fileName, "application/pdf")
            document.close()

            filePath
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun exportToPng(
        context: Context,
        note: NoteEntity,
        blocks: List<NoteBlockEntity>,
        options: ExportOptions = ExportOptions(),
        resolution: Resolution = Resolution.FHD
    ): String? {
        return try {
            val width = resolution.width
            val margin = 40f

            // Calculate total height
            val textPaint = Paint().apply {
                textSize = 16f
                isAntiAlias = true
            }
            var totalHeight = margin * 2 + 60f // title
            for (block in blocks) {
                val lines = wrapText(block.content, textPaint, width - 2 * margin)
                totalHeight += lines.size * (block.fontSize + 4f) + 8f
                if (block.type == "image") totalHeight += 300f
            }
            totalHeight = maxOf(totalHeight, resolution.height.toFloat())

            val bitmap = Bitmap.createBitmap(width, totalHeight.toInt(), Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)

            if (options.includeBackground) {
                canvas.drawColor(options.backgroundColor.toInt())
            } else {
                canvas.drawColor(Color.WHITE)
            }

            var yOffset = margin

            // Title
            if (note.title.isNotBlank()) {
                val titlePaint = Paint().apply {
                    color = Color.BLACK
                    textSize = 28f
                    typeface = Typeface.DEFAULT_BOLD
                    isAntiAlias = true
                }
                canvas.drawText(note.title, margin, yOffset + 28f, titlePaint)
                yOffset += 50f
            }

            for (block in blocks) {
                val paint = Paint().apply {
                    color = block.textColor.toInt()
                    textSize = block.fontSize
                    isAntiAlias = true
                    typeface = when {
                        block.isBold -> Typeface.DEFAULT_BOLD
                        else -> Typeface.DEFAULT
                    }
                    if (block.isUnderline) flags = flags or Paint.UNDERLINE_TEXT_FLAG
                }

                val prefix = when (block.type) {
                    "bullet" -> "• "
                    "numbered" -> "${block.orderIndex + 1}. "
                    else -> ""
                }

                val lines = wrapText(block.content, paint, width - 2 * margin)
                for (line in lines) {
                    val text = if (line == lines.first()) prefix + line else line
                    val x = when (block.alignment) {
                        "center" -> (width - paint.measureText(text)) / 2f
                        "right" -> width - margin - paint.measureText(text)
                        else -> margin
                    }
                    canvas.drawText(text, x, yOffset + block.fontSize, paint)
                    yOffset += block.fontSize + 4f
                }

                yOffset += 8f
            }

            val fileName = "Docufiy_${note.title.take(20).replace(" ", "_")}_${System.currentTimeMillis()}.png"
            val file = File(context.cacheDir, fileName)
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, options.quality, out)
            }
            bitmap.recycle()

            // Copy to MediaStore
            saveImageToMediaStore(context, file, fileName)
            file.absolutePath
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun exportToTxt(
        context: Context,
        note: NoteEntity,
        blocks: List<NoteBlockEntity>
    ): String? {
        return try {
            val sb = StringBuilder()
            if (note.title.isNotBlank()) {
                sb.appendLine(note.title)
                sb.appendLine("=".repeat(note.title.length))
                sb.appendLine()
            }

            for (block in blocks) {
                val prefix = when (block.type) {
                    "heading" -> "## "
                    "bullet" -> "• "
                    "numbered" -> "${block.orderIndex + 1}. "
                    "image" -> "[Image] "
                    "ocr_text" -> "[OCR] "
                    else -> ""
                }
                sb.appendLine("$prefix${block.content}")
            }

            val fileName = "Docufiy_${note.title.take(20).replace(" ", "_")}_${System.currentTimeMillis()}.txt"
            val file = File(context.cacheDir, fileName)
            file.writeText(sb.toString())
            file.absolutePath
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun wrapText(text: String, paint: Paint, maxWidth: Float): List<String> {
        if (text.isBlank()) return listOf("")
        val words = text.split(" ")
        val lines = mutableListOf<String>()
        var currentLine = StringBuilder()

        for (word in words) {
            val testLine = if (currentLine.isEmpty()) word else "$currentLine $word"
            if (paint.measureText(testLine) <= maxWidth) {
                currentLine = StringBuilder(testLine)
            } else {
                if (currentLine.isNotEmpty()) lines.add(currentLine.toString())
                currentLine = StringBuilder(word)
            }
        }
        if (currentLine.isNotEmpty()) lines.add(currentLine.toString())
        return lines.ifEmpty { listOf("") }
    }

    private fun saveToMediaStore(
        context: Context,
        document: PdfDocument,
        fileName: String,
        mimeType: String
    ): String? {
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, fileName)
            put(MediaStore.Downloads.MIME_TYPE, mimeType)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/DocufiyNotes")
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
        }

        val resolver = context.contentResolver
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: return null

        resolver.openOutputStream(uri)?.use { out ->
            document.writeTo(out)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
        }

        return uri.toString()
    }

    private fun saveImageToMediaStore(context: Context, file: File, fileName: String) {
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/DocufiyNotes")
            }
        }
        val resolver = context.contentResolver
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
        uri?.let {
            resolver.openOutputStream(it)?.use { out ->
                file.inputStream().use { input -> input.copyTo(out) }
            }
        }
    }
}
