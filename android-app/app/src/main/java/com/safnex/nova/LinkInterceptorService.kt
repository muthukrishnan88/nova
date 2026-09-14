package com.safnex.nova

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.regex.Pattern

class LinkInterceptorService : AccessibilityService() {

    private val urlPattern = Pattern.compile(
        "(?:^|[\\W])((ht|f)tp(s?)://|www\\.)" +
                "(([\\w\\-]+\\.){1,}?([\\w\\-.~]+/?)*" +
                "[\\p{Alnum}.,%_=?&#\\-+()\\[\\]*$~@!:/{};']*)",
        Pattern.CASE_INSENSITIVE or Pattern.MULTILINE or Pattern.DOTALL
    )

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // Check if service is enabled
        val enabled = getSharedPreferences("MainActivity", MODE_PRIVATE)
            .getBoolean("enabled", false)

        if (!enabled) return

        // Detect clicks and window changes
        when (event.eventType) {
            AccessibilityEvent.TYPE_VIEW_CLICKED,
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                detectLinks(event)
            }
        }
    }

    private fun detectLinks(event: AccessibilityEvent) {
        try {
            val source = event.source ?: return
            val links = extractLinks(source)

            if (links.isNotEmpty()) {
                Log.d("SafnexNova", "Detected links: $links")
                // Show link check popup for first detected link
                showLinkCheck(links.first())
            }

            source.recycle()
        } catch (e: Exception) {
            Log.e("SafnexNova", "Error detecting links", e)
        }
    }

    private fun extractLinks(node: AccessibilityNodeInfo): List<String> {
        val links = mutableListOf<String>()

        // Check node text
        node.text?.toString()?.let { text ->
            val matcher = urlPattern.matcher(text)
            while (matcher.find()) {
                matcher.group()?.let { url ->
                    val cleanUrl = cleanUrl(url)
                    if (cleanUrl.isNotEmpty() && !links.contains(cleanUrl)) {
                        links.add(cleanUrl)
                    }
                }
            }
        }

        // Check content description
        node.contentDescription?.toString()?.let { desc ->
            val matcher = urlPattern.matcher(desc)
            while (matcher.find()) {
                matcher.group()?.let { url ->
                    val cleanUrl = cleanUrl(url)
                    if (cleanUrl.isNotEmpty() && !links.contains(cleanUrl)) {
                        links.add(cleanUrl)
                    }
                }
            }
        }

        // Check children recursively
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                links.addAll(extractLinks(child))
                child.recycle()
            }
        }

        return links.distinct()
    }

    private fun cleanUrl(url: String): String {
        var cleaned = url.trim()

        // Remove leading non-URL characters
        cleaned = cleaned.replace(Regex("^[^a-zA-Z]+"), "")

        // Add http:// if missing protocol
        if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
            cleaned = "https://$cleaned"
        }

        return cleaned
    }

    private fun showLinkCheck(url: String) {
        // Check if popup is already showing
        val intent = Intent(this, LinkCheckActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("url", url)
        }
        startActivity(intent)
    }

    override fun onInterrupt() {
        Log.d("SafnexNova", "Service interrupted")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d("SafnexNova", "Service connected")
    }
}
