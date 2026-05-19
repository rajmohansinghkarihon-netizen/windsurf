# Keep Room entities
-keep class com.docufiy.notes.data.local.entity.** { *; }

# Keep Hilt generated classes
-keep class dagger.hilt.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

# ML Kit
-keep class com.google.mlkit.** { *; }
