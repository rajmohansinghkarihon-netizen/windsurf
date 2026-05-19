package com.docufiy.notes.navigation

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.docufiy.notes.ui.editor.NoteEditorScreen
import com.docufiy.notes.ui.export.ExportScreen
import com.docufiy.notes.ui.history.HistoryScreen
import com.docufiy.notes.ui.home.HomeScreen
import com.docufiy.notes.ui.home.HomeViewModel
import com.docufiy.notes.ui.ocr.OcrScreen
import com.docufiy.notes.ui.saved.SavedNotesScreen
import com.docufiy.notes.ui.settings.SettingsScreen
import com.docufiy.notes.ui.templates.TemplatePickerScreen
import com.docufiy.notes.ui.webimport.WebImportScreen

sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Editor : Screen("editor/{noteId}") {
        fun createRoute(noteId: Long) = "editor/$noteId"
    }
    data object SavedNotes : Screen("saved_notes")
    data object History : Screen("history")
    data object Ocr : Screen("ocr?noteId={noteId}") {
        fun createRoute(noteId: Long? = null) =
            if (noteId != null) "ocr?noteId=$noteId" else "ocr"
    }
    data object Export : Screen("export/{noteId}") {
        fun createRoute(noteId: Long) = "export/$noteId"
    }
    data object Settings : Screen("settings")
    data object TemplatePicker : Screen("template_picker")
    data object WebImport : Screen("web_import")
}

@Composable
fun DocufiyNavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            val homeViewModel: HomeViewModel = hiltViewModel()
            HomeScreen(
                onNewNote = {
                    homeViewModel.createNewNote { noteId ->
                        navController.navigate(Screen.Editor.createRoute(noteId))
                    }
                },
                onOpenNote = { noteId ->
                    navController.navigate(Screen.Editor.createRoute(noteId))
                },
                onSavedNotes = {
                    navController.navigate(Screen.SavedNotes.route)
                },
                onHistory = {
                    navController.navigate(Screen.History.route)
                },
                onSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onTemplates = {
                    navController.navigate(Screen.TemplatePicker.route)
                },
                onWebImport = {
                    navController.navigate(Screen.WebImport.route)
                },
                viewModel = homeViewModel
            )
        }

        composable(
            route = Screen.Editor.route,
            arguments = listOf(navArgument("noteId") { type = NavType.LongType })
        ) {
            NoteEditorScreen(
                onBack = { navController.popBackStack() },
                onOcr = {
                    val noteId = it.arguments?.getLong("noteId") ?: return@NoteEditorScreen
                    navController.navigate(Screen.Ocr.createRoute(noteId))
                }
            )
        }

        composable(Screen.SavedNotes.route) {
            SavedNotesScreen(
                onBack = { navController.popBackStack() },
                onOpenNote = { noteId ->
                    navController.navigate(Screen.Editor.createRoute(noteId))
                },
                onExportNote = { noteId ->
                    navController.navigate(Screen.Export.createRoute(noteId))
                }
            )
        }

        composable(Screen.History.route) {
            HistoryScreen(
                onBack = { navController.popBackStack() },
                onOpenNote = { noteId ->
                    navController.navigate(Screen.Editor.createRoute(noteId))
                }
            )
        }

        composable(
            route = Screen.Ocr.route,
            arguments = listOf(
                navArgument("noteId") {
                    type = NavType.LongType
                    defaultValue = -1L
                }
            )
        ) { backStackEntry ->
            val noteId = backStackEntry.arguments?.getLong("noteId") ?: -1L
            OcrScreen(
                onBack = { navController.popBackStack() },
                onInsertToNote = { text ->
                    navController.previousBackStackEntry?.savedStateHandle?.set("ocrText", text)
                    navController.popBackStack()
                },
                onSaveAsNewNote = { text ->
                    navController.popBackStack()
                }
            )
        }

        composable(
            route = Screen.Export.route,
            arguments = listOf(navArgument("noteId") { type = NavType.LongType })
        ) {
            ExportScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.TemplatePicker.route) {
            val homeViewModel: HomeViewModel = hiltViewModel()
            TemplatePickerScreen(
                onBack = { navController.popBackStack() },
                onTemplateSelected = { templateId ->
                    homeViewModel.createNoteFromTemplate(templateId) { noteId ->
                        navController.popBackStack()
                        navController.navigate(Screen.Editor.createRoute(noteId))
                    }
                },
                onBlankNote = {
                    homeViewModel.createNewNote { noteId ->
                        navController.popBackStack()
                        navController.navigate(Screen.Editor.createRoute(noteId))
                    }
                }
            )
        }

        composable(Screen.WebImport.route) {
            WebImportScreen(
                onBack = { navController.popBackStack() },
                onNoteCreated = { noteId ->
                    navController.popBackStack()
                    navController.navigate(Screen.Editor.createRoute(noteId))
                }
            )
        }
    }
}
