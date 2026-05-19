package com.docufiy.notes.util

object HinglishTransliterator {

    private val consonants = mapOf(
        "ksh" to "क्ष",
        "gya" to "ज्ञ",
        "tra" to "त्र",
        "shr" to "श्र",
        "shh" to "षः",
        "kh" to "ख",
        "gh" to "घ",
        "ch" to "च",
        "chh" to "छ",
        "jh" to "झ",
        "th" to "थ",
        "dh" to "ध",
        "ph" to "फ",
        "bh" to "भ",
        "sh" to "श",
        "ng" to "ं",
        "nn" to "ण",
        "tt" to "ट्ट",
        "dd" to "ड्ड",
        "k" to "क",
        "g" to "ग",
        "c" to "च",
        "j" to "ज",
        "t" to "त",
        "d" to "द",
        "n" to "न",
        "p" to "प",
        "b" to "ब",
        "m" to "म",
        "y" to "य",
        "r" to "र",
        "l" to "ल",
        "v" to "व",
        "w" to "व",
        "s" to "स",
        "h" to "ह",
        "f" to "फ़",
        "z" to "ज़",
        "x" to "क्स",
        "q" to "क़"
    )

    private val vowels = mapOf(
        "aa" to "ा",
        "ai" to "ै",
        "au" to "ौ",
        "ee" to "ी",
        "ei" to "ै",
        "oo" to "ू",
        "ou" to "ौ",
        "a" to "",
        "e" to "े",
        "i" to "ि",
        "o" to "ो",
        "u" to "ु"
    )

    private val independentVowels = mapOf(
        "aa" to "आ",
        "ai" to "ऐ",
        "au" to "औ",
        "ee" to "ई",
        "ei" to "ऐ",
        "oo" to "ऊ",
        "ou" to "औ",
        "a" to "अ",
        "e" to "ए",
        "i" to "इ",
        "o" to "ओ",
        "u" to "उ"
    )

    private val commonWords = mapOf(
        "ka" to "का",
        "ki" to "की",
        "ke" to "के",
        "ko" to "को",
        "se" to "से",
        "me" to "में",
        "mein" to "में",
        "mai" to "मैं",
        "main" to "मैं",
        "hai" to "है",
        "hain" to "हैं",
        "ho" to "हो",
        "tha" to "था",
        "thi" to "थी",
        "the" to "थे",
        "ye" to "ये",
        "yeh" to "यह",
        "wo" to "वो",
        "woh" to "वह",
        "kya" to "क्या",
        "nahi" to "नहीं",
        "nahin" to "नहीं",
        "nhi" to "नहीं",
        "aur" to "और",
        "ya" to "या",
        "par" to "पर",
        "per" to "पर",
        "lekin" to "लेकिन",
        "magar" to "मगर",
        "agar" to "अगर",
        "toh" to "तो",
        "to" to "तो",
        "bhi" to "भी",
        "ab" to "अब",
        "jab" to "जब",
        "tab" to "तब",
        "kab" to "कब",
        "abhi" to "अभी",
        "sabhi" to "सभी",
        "bahut" to "बहुत",
        "bohot" to "बहुत",
        "accha" to "अच्छा",
        "acha" to "अच्छा",
        "theek" to "ठीक",
        "thik" to "ठीक",
        "sab" to "सब",
        "kuch" to "कुछ",
        "koi" to "कोई",
        "apna" to "अपना",
        "apni" to "अपनी",
        "apne" to "अपने",
        "mera" to "मेरा",
        "meri" to "मेरी",
        "mere" to "मेरे",
        "tera" to "तेरा",
        "teri" to "तेरी",
        "tere" to "तेरे",
        "tumhara" to "तुम्हारा",
        "tumhari" to "तुम्हारी",
        "uska" to "उसका",
        "uski" to "उसकी",
        "unka" to "उनका",
        "unki" to "उनकी",
        "hamara" to "हमारा",
        "hamari" to "हमारी",
        "hamare" to "हमारे",
        "naam" to "नाम",
        "kaam" to "काम",
        "ghar" to "घर",
        "log" to "लोग",
        "din" to "दिन",
        "raat" to "रात",
        "paani" to "पानी",
        "pani" to "पानी",
        "khana" to "खाना",
        "jana" to "जाना",
        "aana" to "आना",
        "karna" to "करना",
        "hona" to "होना",
        "rehna" to "रहना",
        "bolna" to "बोलना",
        "sunna" to "सुनना",
        "dekhna" to "देखना",
        "padhai" to "पढ़ाई",
        "padh" to "पढ़",
        "likh" to "लिख",
        "likhna" to "लिखना",
        "padhna" to "पढ़ना",
        "samajh" to "समझ",
        "samajhna" to "समझना",
        "sochna" to "सोचना",
        "milna" to "मिलना",
        "dena" to "देना",
        "lena" to "लेना",
        "ek" to "एक",
        "do" to "दो",
        "teen" to "तीन",
        "chaar" to "चार",
        "paanch" to "पाँच",
        "panch" to "पाँच",
        "namaste" to "नमस्ते",
        "dhanyavaad" to "धन्यवाद",
        "shukriya" to "शुक्रिया",
        "vivek" to "विवेक"
    )

    fun transliterate(input: String): String {
        if (input.isBlank()) return input

        val words = input.split(" ")
        return words.joinToString(" ") { word ->
            transliterateWord(word.lowercase())
        }
    }

    fun getSuggestions(word: String): List<String> {
        if (word.isBlank()) return emptyList()
        val lower = word.lowercase()

        val suggestions = mutableListOf<String>()

        commonWords[lower]?.let { suggestions.add(it) }

        val transliterated = transliterateWord(lower)
        if (transliterated !in suggestions) {
            suggestions.add(transliterated)
        }

        commonWords.entries
            .filter { it.key.startsWith(lower) && it.key != lower }
            .take(3)
            .forEach { suggestions.add(it.value) }

        return suggestions.distinct().take(5)
    }

    private fun transliterateWord(word: String): String {
        commonWords[word]?.let { return it }

        val result = StringBuilder()
        var i = 0
        var lastWasConsonant = false

        while (i < word.length) {
            val char = word[i]

            if (!char.isLetter()) {
                result.append(char)
                lastWasConsonant = false
                i++
                continue
            }

            // Try matching consonant clusters (3, 2, 1 chars)
            var matched = false
            for (len in 3 downTo 1) {
                if (i + len <= word.length) {
                    val sub = word.substring(i, i + len)
                    consonants[sub]?.let { hindi ->
                        if (lastWasConsonant) {
                            result.append("्")
                        }
                        result.append(hindi)
                        lastWasConsonant = true
                        i += len

                        // Check for following vowel
                        var vowelMatched = false
                        for (vLen in 2 downTo 1) {
                            if (i + vLen <= word.length) {
                                val vSub = word.substring(i, i + vLen)
                                vowels[vSub]?.let { matra ->
                                    result.append(matra)
                                    lastWasConsonant = false
                                    i += vLen
                                    vowelMatched = true
                                }
                            }
                            if (vowelMatched) break
                        }
                        if (!vowelMatched) {
                            // inherent 'a' sound handled by absence of halant
                        }
                        matched = true
                    }
                }
                if (matched) break
            }

            if (!matched) {
                // Try independent vowel
                var vowelMatched = false
                for (vLen in 2 downTo 1) {
                    if (i + vLen <= word.length) {
                        val vSub = word.substring(i, i + vLen)
                        independentVowels[vSub]?.let { hindi ->
                            if (lastWasConsonant) {
                                val matra = vowels[vSub]
                                if (matra != null) {
                                    result.append(matra)
                                } else {
                                    result.append(hindi)
                                }
                            } else {
                                result.append(hindi)
                            }
                            lastWasConsonant = false
                            i += vLen
                            vowelMatched = true
                        }
                    }
                    if (vowelMatched) break
                }

                if (!vowelMatched) {
                    result.append(char)
                    lastWasConsonant = false
                    i++
                }
            }
        }

        return result.toString()
    }
}
