package com.docufiy.notes.ui.ocr

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

data class OcrUiState(
    val extractedText: String = "",
    val isProcessing: Boolean = false,
    val error: String? = null,
    val selectedImageUri: Uri? = null,
    val recognitionMode: String = "latin" // latin or devanagari
)

@HiltViewModel
class OcrViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(OcrUiState())
    val uiState: StateFlow<OcrUiState> = _uiState.asStateFlow()

    private val latinRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val devanagariRecognizer = TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())

    fun setRecognitionMode(mode: String) {
        _uiState.value = _uiState.value.copy(recognitionMode = mode)
    }

    fun processImage(uri: Uri) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isProcessing = true,
                error = null,
                selectedImageUri = uri
            )

            try {
                val image = InputImage.fromFilePath(appContext, uri)
                val recognizer = if (_uiState.value.recognitionMode == "devanagari") {
                    devanagariRecognizer
                } else {
                    latinRecognizer
                }

                val result = recognizer.process(image).await()
                _uiState.value = _uiState.value.copy(
                    extractedText = result.text,
                    isProcessing = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "OCR processing failed",
                    isProcessing = false
                )
            }
        }
    }

    fun clearResult() {
        _uiState.value = OcrUiState()
    }

    override fun onCleared() {
        super.onCleared()
        latinRecognizer.close()
        devanagariRecognizer.close()
    }
}
