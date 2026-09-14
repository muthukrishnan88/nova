package com.safnex.nova

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import kotlinx.coroutines.*

class LinkCheckActivity : AppCompatActivity() {

    private lateinit var linkText: TextView
    private lateinit var statusText: TextView
    private lateinit var riskText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var openButton: Button
    private lateinit var cancelButton: Button
    private lateinit var reportButton: Button
    private lateinit var resultCard: CardView

    private var currentUrl: String = ""
    private var analysisResult: LinkAnalysisResult? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make activity appear as dialog
        window.setLayout(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT
        )

        setContentView(R.layout.activity_link_check)

        linkText = findViewById(R.id.linkText)
        statusText = findViewById(R.id.statusText)
        riskText = findViewById(R.id.riskText)
        progressBar = findViewById(R.id.progressBar)
        openButton = findViewById(R.id.openButton)
        cancelButton = findViewById(R.id.cancelButton)
        reportButton = findViewById(R.id.reportButton)
        resultCard = findViewById(R.id.resultCard)

        currentUrl = intent.getStringExtra("url") ?: ""

        if (currentUrl.isEmpty()) {
            finish()
            return
        }

        linkText.text = currentUrl
        showLoading()

        // Analyze link
        CoroutineScope(Dispatchers.Main).launch {
            analyzeLink()
        }

        openButton.setOnClickListener {
            openLink()
        }

        cancelButton.setOnClickListener {
            finish()
        }

        reportButton.setOnClickListener {
            openFullReport()
        }
    }

    private suspend fun analyzeLink() {
        try {
            val result = withContext(Dispatchers.IO) {
                ApiClient.analyzeLink(currentUrl)
            }

            analysisResult = result
            showResult(result)
        } catch (e: Exception) {
            showError(e.message ?: "Failed to analyze link")
        }
    }

    private fun showLoading() {
        progressBar.visibility = View.VISIBLE
        statusText.text = "Checking link with SAFNEX NOVA..."
        resultCard.visibility = View.GONE
        openButton.isEnabled = false
        reportButton.visibility = View.GONE
    }

    private fun showResult(result: LinkAnalysisResult) {
        progressBar.visibility = View.GONE
        resultCard.visibility = View.VISIBLE
        openButton.isEnabled = true
        reportButton.visibility = View.VISIBLE

        when (result.risk.lowercase()) {
            "safe" -> {
                statusText.text = "✅ This link appears SAFE"
                riskText.text = "Risk Level: LOW"
                riskText.setTextColor(getColor(android.R.color.holo_green_dark))
                resultCard.setCardBackgroundColor(getColor(R.color.safe_background))
                openButton.text = "OPEN LINK"
            }
            "suspicious" -> {
                statusText.text = "⚠️ This link is SUSPICIOUS"
                riskText.text = "Risk Level: MEDIUM"
                riskText.setTextColor(getColor(android.R.color.holo_orange_dark))
                resultCard.setCardBackgroundColor(getColor(R.color.warning_background))
                openButton.text = "OPEN ANYWAY (NOT RECOMMENDED)"
            }
            "dangerous" -> {
                statusText.text = "🚨 This link is DANGEROUS"
                riskText.text = "Risk Level: HIGH"
                riskText.setTextColor(getColor(android.R.color.holo_red_dark))
                resultCard.setCardBackgroundColor(getColor(R.color.danger_background))
                openButton.text = "OPEN ANYWAY (DANGEROUS)"
            }
            else -> {
                statusText.text = "❓ Unable to determine risk"
                riskText.text = "Risk Level: UNKNOWN"
                riskText.setTextColor(getColor(android.R.color.darker_gray))
                openButton.text = "OPEN LINK"
            }
        }
    }

    private fun showError(message: String) {
        progressBar.visibility = View.GONE
        statusText.text = "⚠️ $message"
        riskText.text = "Unable to check link. Proceed with caution."
        riskText.setTextColor(getColor(android.R.color.holo_orange_dark))
        openButton.isEnabled = true
        openButton.text = "OPEN ANYWAY"
    }

    private fun openLink() {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(currentUrl))
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            startActivity(intent)
        } catch (e: Exception) {
            // If opening fails, just close
        }
        finish()
    }

    private fun openFullReport() {
        // Open web interface with this link pre-filled
        val webUrl = "https://safnex-nova.onrender.com/link-detector.html?url=${Uri.encode(currentUrl)}"
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(webUrl))
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            startActivity(intent)
        } catch (e: Exception) {
            // Fallback: just close
        }
        finish()
    }
}

data class LinkAnalysisResult(
    val risk: String,
    val score: Int,
    val reasons: List<String>
)
