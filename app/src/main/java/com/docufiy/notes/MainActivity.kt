package com.docufiy.notes

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.fragment.app.FragmentActivity
import androidx.navigation.compose.rememberNavController
import com.docufiy.notes.data.preferences.AppPreferences
import com.docufiy.notes.navigation.DocufiyNavGraph
import com.docufiy.notes.ui.lock.LockScreen
import com.docufiy.notes.ui.theme.DocufiyNotesTheme
import com.docufiy.notes.util.BiometricHelper
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {

    @Inject
    lateinit var preferences: AppPreferences

    private var isUnlocked by mutableStateOf(false)
    private var lockError by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val darkMode by preferences.darkMode.collectAsState(initial = false)
            val accentColor by preferences.accentColor.collectAsState(initial = 0xFF6750A4)
            val appLockEnabled by preferences.appLockEnabled.collectAsState(initial = false)

            DocufiyNotesTheme(
                darkTheme = darkMode,
                dynamicColor = false,
                accentColor = Color(accentColor)
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    if (appLockEnabled && !isUnlocked) {
                        LockScreen(
                            onUnlockRequest = { authenticateBiometric() },
                            errorMessage = lockError
                        )
                    } else {
                        val navController = rememberNavController()
                        DocufiyNavGraph(navController = navController)
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Re-check lock on resume (when app comes back from background)
        // Only auto-prompt if lock is enabled and not yet unlocked
    }

    private fun authenticateBiometric() {
        if (!BiometricHelper.isBiometricAvailable(this)) {
            // If biometric is not available, unlock directly
            isUnlocked = true
            return
        }

        BiometricHelper.authenticate(
            activity = this,
            onSuccess = {
                isUnlocked = true
                lockError = null
            },
            onError = { error ->
                lockError = error
            },
            onFailed = {
                lockError = "Authentication failed. Try again."
            }
        )
    }
}
