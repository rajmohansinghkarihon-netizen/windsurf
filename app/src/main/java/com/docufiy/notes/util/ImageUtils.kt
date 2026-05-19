package com.docufiy.notes.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

object ImageUtils {

    fun saveImageToInternal(
        context: Context,
        uri: Uri,
        noteId: Long,
        maxWidth: Int = 1920,
        maxHeight: Int = 1920,
        quality: Int = 85
    ): ImageSaveResult? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return null
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeStream(inputStream, null, options)
            inputStream.close()

            val originalWidth = options.outWidth
            val originalHeight = options.outHeight

            val sampleSize = calculateSampleSize(originalWidth, originalHeight, maxWidth, maxHeight)

            val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            val stream = context.contentResolver.openInputStream(uri) ?: return null
            val bitmap = BitmapFactory.decodeStream(stream, null, decodeOptions)
            stream.close()
            bitmap ?: return null

            val scaled = scaleBitmap(bitmap, maxWidth, maxHeight)

            val imagesDir = File(context.filesDir, "images/note_$noteId")
            imagesDir.mkdirs()

            val fileName = "${UUID.randomUUID()}.jpg"
            val file = File(imagesDir, fileName)

            FileOutputStream(file).use { out ->
                scaled.compress(Bitmap.CompressFormat.JPEG, quality, out)
            }

            if (scaled != bitmap) scaled.recycle()
            bitmap.recycle()

            ImageSaveResult(
                localPath = file.absolutePath,
                originalWidth = originalWidth,
                originalHeight = originalHeight,
                savedWidth = scaled.width,
                savedHeight = scaled.height,
                fileSize = file.length()
            )
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun deleteImage(path: String): Boolean {
        return try {
            File(path).delete()
        } catch (e: Exception) {
            false
        }
    }

    fun loadBitmap(path: String, reqWidth: Int = 0, reqHeight: Int = 0): Bitmap? {
        return try {
            if (reqWidth > 0 && reqHeight > 0) {
                val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeFile(path, options)
                options.inSampleSize = calculateSampleSize(
                    options.outWidth, options.outHeight, reqWidth, reqHeight
                )
                options.inJustDecodeBounds = false
                BitmapFactory.decodeFile(path, options)
            } else {
                BitmapFactory.decodeFile(path)
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun calculateSampleSize(
        width: Int, height: Int, reqWidth: Int, reqHeight: Int
    ): Int {
        var sampleSize = 1
        if (height > reqHeight || width > reqWidth) {
            val halfH = height / 2
            val halfW = width / 2
            while (halfH / sampleSize >= reqHeight && halfW / sampleSize >= reqWidth) {
                sampleSize *= 2
            }
        }
        return sampleSize
    }

    private fun scaleBitmap(bitmap: Bitmap, maxWidth: Int, maxHeight: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height

        if (width <= maxWidth && height <= maxHeight) return bitmap

        val ratio = minOf(maxWidth.toFloat() / width, maxHeight.toFloat() / height)
        val newWidth = (width * ratio).toInt()
        val newHeight = (height * ratio).toInt()

        return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
    }

    data class ImageSaveResult(
        val localPath: String,
        val originalWidth: Int,
        val originalHeight: Int,
        val savedWidth: Int,
        val savedHeight: Int,
        val fileSize: Long
    )
}
