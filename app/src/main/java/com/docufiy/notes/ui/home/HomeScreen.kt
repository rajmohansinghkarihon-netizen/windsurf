package com.docufiy.notes.ui.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Note
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Scanner
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.ViewModule
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material.icons.outlined.NoteAdd
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SearchBar
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.docufiy.notes.data.local.entity.NoteEntity
import com.docufiy.notes.ui.components.TagChips
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNewNote: () -> Unit,
    onOpenNote: (Long) -> Unit,
    onSavedNotes: () -> Unit,
    onHistory: () -> Unit,
    onSettings: () -> Unit,
    onTemplates: () -> Unit = {},
    onWebImport: () -> Unit = {},
    onOcr: () -> Unit = {},
    onFavorites: () -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var isSearchActive by remember { mutableStateOf(false) }
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                modifier = Modifier.width(280.dp)
            ) {
                // App branding
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 24.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            "Docufiy",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            "Notes",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                Spacer(modifier = Modifier.height(8.dp))

                // Navigation items
                DrawerMenuItem(
                    icon = Icons.Default.Description,
                    label = "Home",
                    selected = true,
                    onClick = {
                        scope.launch { drawerState.close() }
                    }
                )
                DrawerMenuItem(
                    icon = Icons.Outlined.NoteAdd,
                    label = "New Note",
                    onClick = {
                        scope.launch { drawerState.close() }
                        onTemplates()
                    }
                )
                DrawerMenuItem(
                    icon = Icons.Outlined.FolderOpen,
                    label = "Saved Notes",
                    onClick = {
                        scope.launch { drawerState.close() }
                        onSavedNotes()
                    }
                )
                DrawerMenuItem(
                    icon = Icons.Default.History,
                    label = "History",
                    onClick = {
                        scope.launch { drawerState.close() }
                        onHistory()
                    }
                )
                DrawerMenuItem(
                    icon = Icons.Default.Language,
                    label = "Web to Note",
                    onClick = {
                        scope.launch { drawerState.close() }
                        onWebImport()
                    }
                )
                DrawerMenuItem(
                    icon = Icons.Default.Scanner,
                    label = "OCR Import",
                    onClick = {
                        scope.launch { drawerState.close() }
                        onOcr()
                    }
                )
                DrawerMenuItem(
                    icon = Icons.Default.Favorite,
                    label = "Favorites",
                    onClick = {
                        scope.launch { drawerState.close() }
                        onFavorites()
                    }
                )
                DrawerMenuItem(
                    icon = Icons.Default.Delete,
                    label = "Trash",
                    onClick = {
                        scope.launch { drawerState.close() }
                        onHistory()
                    }
                )

                Spacer(modifier = Modifier.weight(1f))
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                Spacer(modifier = Modifier.height(4.dp))

                DrawerMenuItem(
                    icon = Icons.Default.Settings,
                    label = "Settings",
                    onClick = {
                        scope.launch { drawerState.close() }
                        onSettings()
                    }
                )
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            "Docufiy Notes",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = {
                            scope.launch { drawerState.open() }
                        }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menu")
                        }
                    },
                    actions = {
                        IconButton(onClick = { isSearchActive = !isSearchActive }) {
                            Icon(Icons.Default.Search, contentDescription = "Search")
                        }
                        IconButton(onClick = onSettings) {
                            Icon(Icons.Default.MoreVert, contentDescription = "More")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                )
            },
            floatingActionButton = {
                FloatingActionButton(
                    onClick = onTemplates,
                    containerColor = MaterialTheme.colorScheme.primary,
                    shape = CircleShape
                ) {
                    Icon(Icons.Default.Add, contentDescription = "New Note")
                }
            }
        ) { padding ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Search bar
                item {
                    AnimatedVisibility(visible = isSearchActive) {
                        SearchBar(
                            query = searchQuery,
                            onQueryChange = {
                                searchQuery = it
                                viewModel.onSearchQueryChanged(it)
                            },
                            onSearch = { viewModel.onSearchQueryChanged(it) },
                            active = false,
                            onActiveChange = {},
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Search notes...") },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) }
                        ) {}
                    }
                }

                // Search results
                if (searchQuery.isNotBlank() && searchResults.isNotEmpty()) {
                    item {
                        Text(
                            "Search Results",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    items(searchResults) { note ->
                        NoteListItem(
                            note = note,
                            onClick = { onOpenNote(note.id) },
                            onToggleFavorite = { viewModel.toggleFavorite(note.id, note.isFavorite) },
                            onTogglePin = { viewModel.togglePin(note.id, note.isPinned) }
                        )
                    }
                }

                // ═══════════════════════════════════
                // TOP QUICK ACTION CARDS (matching mockup)
                // ═══════════════════════════════════
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        TopActionCard(
                            icon = Icons.Outlined.NoteAdd,
                            label = "New Note",
                            subtitle = "Start writing",
                            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f),
                            onClick = onTemplates,
                            modifier = Modifier.weight(1f)
                        )
                        TopActionCard(
                            icon = Icons.Default.Language,
                            label = "Paste URL",
                            subtitle = "Web to Note",
                            containerColor = Color(0xFFE8F5E9),
                            onClick = onWebImport,
                            modifier = Modifier.weight(1f)
                        )
                        TopActionCard(
                            icon = Icons.Default.Scanner,
                            label = "OCR Import",
                            subtitle = "From image/PDF",
                            containerColor = Color(0xFFFFF3E0),
                            onClick = onOcr,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // ═══════════════════════════════════
                // RECENT NOTES - horizontal scroll cards
                // ═══════════════════════════════════
                if (uiState.recentNotes.isNotEmpty()) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Recent Notes",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "View all",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.clickable(onClick = onSavedNotes)
                            )
                        }
                    }
                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(uiState.recentNotes.take(6)) { note ->
                                RecentNoteCard(
                                    note = note,
                                    onClick = { onOpenNote(note.id) },
                                    onToggleFavorite = { viewModel.toggleFavorite(note.id, note.isFavorite) }
                                )
                            }
                        }
                    }
                }

                // ═══════════════════════════════════
                // QUICK ACCESS row
                // ═══════════════════════════════════
                item {
                    Text(
                        "Quick Access",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp, horizontal = 8.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            QuickAccessItem(
                                icon = Icons.Default.PushPin,
                                label = "Pinned Notes",
                                onClick = onSavedNotes
                            )
                            QuickAccessItem(
                                icon = Icons.Default.Star,
                                label = "Templates",
                                onClick = onTemplates
                            )
                            QuickAccessItem(
                                icon = Icons.Default.ViewModule,
                                label = "Export Notes",
                                onClick = onSavedNotes
                            )
                        }
                    }
                }

                // ═══════════════════════════════════
                // RECENT WEB IMPORTS
                // ═══════════════════════════════════
                if (uiState.webClips.isNotEmpty()) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Recent Web Imports",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "View all",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.clickable(onClick = onWebImport)
                            )
                        }
                    }
                    items(uiState.webClips) { note ->
                        WebImportListItem(
                            note = note,
                            onClick = { onOpenNote(note.id) },
                            onToggleFavorite = { viewModel.toggleFavorite(note.id, note.isFavorite) }
                        )
                    }
                }

                // ═══════════════════════════════════
                // CONTINUE WRITING section
                // ═══════════════════════════════════
                if (uiState.continueWritingNote != null) {
                    item {
                        Text(
                            "Continue Writing",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        ContinueWritingCard(
                            note = uiState.continueWritingNote!!,
                            onClick = { onOpenNote(uiState.continueWritingNote!!.id) }
                        )
                    }
                }

                // Empty state
                if (uiState.recentNotes.isEmpty() && uiState.favoriteNotes.isEmpty()) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 48.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.Description,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "No notes yet",
                                style = MaterialTheme.typography.headlineSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                "Tap + to create your first note",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                            )
                        }
                    }
                }

                // Bottom spacer for FAB
                item { Spacer(modifier = Modifier.height(72.dp)) }
            }
        }
    }
}

// ═══════════════════════════════════════════════
// Drawer menu item
// ═══════════════════════════════════════════════
@Composable
private fun DrawerMenuItem(
    icon: ImageVector,
    label: String,
    selected: Boolean = false,
    onClick: () -> Unit
) {
    NavigationDrawerItem(
        icon = {
            Icon(
                icon,
                contentDescription = label,
                tint = if (selected) MaterialTheme.colorScheme.primary
                       else MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        label = {
            Text(
                label,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                color = if (selected) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface
            )
        },
        selected = selected,
        onClick = onClick,
        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
    )
}

// ═══════════════════════════════════════════════
// Top action cards (New Note, Paste URL, OCR Import)
// ═══════════════════════════════════════════════
@Composable
private fun TopActionCard(
    icon: ImageVector,
    label: String,
    subtitle: String,
    containerColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .height(110.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                icon,
                contentDescription = label,
                modifier = Modifier.size(32.dp),
                tint = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
            Text(
                subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1
            )
        }
    }
}

// ═══════════════════════════════════════════════
// Recent Note card (horizontal scroll)
// ═══════════════════════════════════════════════
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RecentNoteCard(
    note: NoteEntity,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit
) {
    val bgColor = Color(note.backgroundColor)
    Card(
        modifier = Modifier
            .width(165.dp)
            .height(180.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp)
        ) {
            // Top: icon area + favorite
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        if (note.isWebImport) Icons.Default.Language
                        else Icons.AutoMirrored.Filled.Note,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(onClick = onToggleFavorite, modifier = Modifier.size(28.dp)) {
                    Icon(
                        if (note.isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Favorite",
                        modifier = Modifier.size(18.dp),
                        tint = if (note.isFavorite) Color.Red
                               else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Title
            Text(
                note.title.ifBlank { "Untitled" },
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))

            // Date
            Text(
                formatDate(note.updatedAt),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // Tag chip
            if (note.tags.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                val firstTag = note.tags.split(",").firstOrNull()?.trim() ?: ""
                if (firstTag.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            firstTag,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 10.sp
                        )
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════
// Quick Access item
// ═══════════════════════════════════════════════
@Composable
private fun QuickAccessItem(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            icon,
            contentDescription = label,
            modifier = Modifier.size(28.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1
        )
    }
}

// ═══════════════════════════════════════════════
// Web Import list item (matching mockup)
// ═══════════════════════════════════════════════
@Composable
private fun WebImportListItem(
    note: NoteEntity,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Web icon / thumbnail
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.tertiaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Language,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.onTertiaryContainer
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    note.title.ifBlank { "Web Import" },
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (!note.sourceUrl.isNullOrBlank()) {
                    val domain = try {
                        java.net.URI(note.sourceUrl).host ?: note.sourceUrl
                    } catch (_: Exception) { note.sourceUrl }
                    Text(
                        domain ?: "",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    formatDate(note.updatedAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            IconButton(onClick = onToggleFavorite, modifier = Modifier.size(32.dp)) {
                Icon(
                    if (note.isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    contentDescription = "Favorite",
                    modifier = Modifier.size(18.dp),
                    tint = if (note.isFavorite) Color.Red
                           else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════
// Continue Writing card
// ═══════════════════════════════════════════════
@Composable
private fun ContinueWritingCard(
    note: NoteEntity,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Description,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    note.title.ifBlank { "Untitled" },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    "Last edited: ${formatDate(note.updatedAt)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            OutlinedButton(onClick = onClick) {
                Text("Continue", fontWeight = FontWeight.Bold)
            }
        }
    }
}

// ═══════════════════════════════════════════════
// Note list item (for search results)
// ═══════════════════════════════════════════════
@Composable
fun NoteListItem(
    note: NoteEntity,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit,
    onTogglePin: (() -> Unit)? = null
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Description,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (note.isPinned) {
                        Icon(
                            Icons.Default.PushPin,
                            contentDescription = "Pinned",
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                    }
                    if (note.isWebImport) {
                        Icon(
                            Icons.Default.Language,
                            contentDescription = "Web Import",
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.tertiary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                    }
                    Text(
                        note.title.ifBlank { "Untitled" },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                if (!note.sourceUrl.isNullOrBlank()) {
                    Text(
                        note.sourceUrl,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.7f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
                if (note.tags.isNotBlank()) {
                    TagChips(
                        tags = note.tags,
                        onTagsChanged = {},
                        editable = false,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                Text(
                    formatDate(note.updatedAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (onTogglePin != null) {
                IconButton(onClick = onTogglePin) {
                    Icon(
                        if (note.isPinned) Icons.Default.PushPin else Icons.Outlined.PushPin,
                        contentDescription = if (note.isPinned) "Unpin" else "Pin",
                        tint = if (note.isPinned) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            IconButton(onClick = onToggleFavorite) {
                Icon(
                    if (note.isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    contentDescription = "Favorite",
                    tint = if (note.isFavorite) Color.Red else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

private fun formatDate(timestamp: Long): String {
    val now = System.currentTimeMillis()
    val diff = now - timestamp
    val sdf = if (diff < 86400000) {
        SimpleDateFormat("hh:mm a", Locale.getDefault())
    } else if (diff < 172800000) {
        return "Yesterday, " + SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date(timestamp))
    } else {
        SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault())
    }
    val formatted = sdf.format(Date(timestamp))
    return if (diff < 86400000) "Today, $formatted" else formatted
}
