package com.docufiy.notes.util

import com.docufiy.notes.data.local.entity.NoteBlockEntity

data class NoteTemplate(
    val id: String,
    val name: String,
    val description: String,
    val icon: String,
    val blocks: List<TemplateBlock>
)

data class TemplateBlock(
    val type: String,
    val content: String,
    val isBold: Boolean = false,
    val fontSize: Float = 16f
)

object NoteTemplates {

    val templates = listOf(
        NoteTemplate(
            id = "meeting",
            name = "Meeting Notes",
            description = "Structured meeting notes with agenda and action items",
            icon = "groups",
            blocks = listOf(
                TemplateBlock("heading", "Meeting Notes", isBold = true, fontSize = 24f),
                TemplateBlock("text", "Date: "),
                TemplateBlock("text", "Attendees: "),
                TemplateBlock("heading", "Agenda", isBold = true, fontSize = 20f),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("heading", "Discussion Points", isBold = true, fontSize = 20f),
                TemplateBlock("numbered", ""),
                TemplateBlock("numbered", ""),
                TemplateBlock("heading", "Action Items", isBold = true, fontSize = 20f),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("heading", "Next Meeting", isBold = true, fontSize = 20f),
                TemplateBlock("text", "Date: ")
            )
        ),
        NoteTemplate(
            id = "todo",
            name = "To-Do List",
            description = "Simple task list with priorities",
            icon = "checklist",
            blocks = listOf(
                TemplateBlock("heading", "To-Do List", isBold = true, fontSize = 24f),
                TemplateBlock("text", "Date: "),
                TemplateBlock("heading", "High Priority", isBold = true, fontSize = 20f),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("heading", "Medium Priority", isBold = true, fontSize = 20f),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("heading", "Low Priority", isBold = true, fontSize = 20f),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("heading", "Completed", isBold = true, fontSize = 20f),
                TemplateBlock("text", "")
            )
        ),
        NoteTemplate(
            id = "diary",
            name = "Diary Entry",
            description = "Daily journal entry template",
            icon = "book",
            blocks = listOf(
                TemplateBlock("heading", "Diary Entry", isBold = true, fontSize = 24f),
                TemplateBlock("text", "Date: "),
                TemplateBlock("text", "Mood: "),
                TemplateBlock("heading", "Today's Highlights", isBold = true, fontSize = 20f),
                TemplateBlock("text", ""),
                TemplateBlock("heading", "What I Learned", isBold = true, fontSize = 20f),
                TemplateBlock("text", ""),
                TemplateBlock("heading", "Grateful For", isBold = true, fontSize = 20f),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("heading", "Tomorrow's Plan", isBold = true, fontSize = 20f),
                TemplateBlock("text", "")
            )
        ),
        NoteTemplate(
            id = "recipe",
            name = "Recipe",
            description = "Cooking recipe with ingredients and steps",
            icon = "restaurant",
            blocks = listOf(
                TemplateBlock("heading", "Recipe Name", isBold = true, fontSize = 24f),
                TemplateBlock("text", "Prep Time: "),
                TemplateBlock("text", "Cook Time: "),
                TemplateBlock("text", "Servings: "),
                TemplateBlock("heading", "Ingredients", isBold = true, fontSize = 20f),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("heading", "Instructions", isBold = true, fontSize = 20f),
                TemplateBlock("numbered", ""),
                TemplateBlock("numbered", ""),
                TemplateBlock("numbered", ""),
                TemplateBlock("numbered", ""),
                TemplateBlock("heading", "Notes", isBold = true, fontSize = 20f),
                TemplateBlock("text", "")
            )
        ),
        NoteTemplate(
            id = "study",
            name = "Study Notes",
            description = "Organized study notes with key concepts",
            icon = "school",
            blocks = listOf(
                TemplateBlock("heading", "Study Notes", isBold = true, fontSize = 24f),
                TemplateBlock("text", "Subject: "),
                TemplateBlock("text", "Chapter: "),
                TemplateBlock("text", "Date: "),
                TemplateBlock("heading", "Key Concepts", isBold = true, fontSize = 20f),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("bullet", ""),
                TemplateBlock("heading", "Important Formulas / Definitions", isBold = true, fontSize = 20f),
                TemplateBlock("numbered", ""),
                TemplateBlock("numbered", ""),
                TemplateBlock("heading", "Summary", isBold = true, fontSize = 20f),
                TemplateBlock("text", ""),
                TemplateBlock("heading", "Questions to Review", isBold = true, fontSize = 20f),
                TemplateBlock("numbered", ""),
                TemplateBlock("numbered", ""),
                TemplateBlock("numbered", "")
            )
        )
    )

    fun getTemplate(id: String): NoteTemplate? = templates.find { it.id == id }

    fun createBlocksFromTemplate(template: NoteTemplate, noteId: Long): List<NoteBlockEntity> {
        return template.blocks.mapIndexed { index, block ->
            NoteBlockEntity(
                noteId = noteId,
                type = block.type,
                content = block.content,
                orderIndex = index,
                isBold = block.isBold,
                fontSize = block.fontSize
            )
        }
    }
}
