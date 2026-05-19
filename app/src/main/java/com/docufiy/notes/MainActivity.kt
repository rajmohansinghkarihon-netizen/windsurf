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
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation.compose.rememberNavController
import com.docufiy.notes.data.preferences.AppPreferences
import com.docufiy.notes.navigation.DocufiyNavGraph
import com.docufiy.notes.ui.theme.DocufiyNotesTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var preferences: AppPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val darkMode by preferences.darkMode.collectAsState(initial = false)
            val accentColor by preferences.accentColor.collectAsState(initial = 0xFF6750A4)

            DocufiyNotesTheme(
                darkTheme = darkMode,
                dynamicColor = false,
                accentColor = Color(accentColor)
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    DocufiyNavGraph(navController = navController)
                }
            }
        }
    }
}
