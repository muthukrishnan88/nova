package com.safnex.nova

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.Switch
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var enableSwitch: Switch
    private lateinit var statusButton: Button
    private lateinit var settingsButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        enableSwitch = findViewById(R.id.enableSwitch)
        statusButton = findViewById(R.id.statusButton)
        settingsButton = findViewById(R.id.settingsButton)

        // Check if service is enabled
        updateServiceStatus()

        enableSwitch.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                if (!isAccessibilityServiceEnabled()) {
                    showAccessibilityDialog()
                    enableSwitch.isChecked = false
                } else if (!canDrawOverlays()) {
                    showOverlayDialog()
                    enableSwitch.isChecked = false
                } else {
                    saveEnabled(true)
                    Toast.makeText(this, "Link protection enabled", Toast.LENGTH_SHORT).show()
                }
            } else {
                saveEnabled(false)
                Toast.makeText(this, "Link protection disabled", Toast.LENGTH_SHORT).show()
            }
        }

        statusButton.setOnClickListener {
            updateServiceStatus()
        }

        settingsButton.setOnClickListener {
            openAccessibilitySettings()
        }
    }

    override fun onResume() {
        super.onResume()
        updateServiceStatus()
    }

    private fun updateServiceStatus() {
        val accessibilityEnabled = isAccessibilityServiceEnabled()
        val overlayEnabled = canDrawOverlays()
        val serviceEnabled = getPreferences(MODE_PRIVATE).getBoolean("enabled", false)

        enableSwitch.isChecked = accessibilityEnabled && overlayEnabled && serviceEnabled

        val status = when {
            !accessibilityEnabled -> "⚠️ Accessibility permission required"
            !overlayEnabled -> "⚠️ Overlay permission required"
            serviceEnabled -> "✅ Link protection active"
            else -> "⏸️ Link protection disabled"
        }

        statusButton.text = status
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val service = "$packageName/${LinkInterceptorService::class.java.canonicalName}"
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        return enabledServices?.contains(service) == true
    }

    private fun canDrawOverlays(): Boolean {
        return Settings.canDrawOverlays(this)
    }

    private fun saveEnabled(enabled: Boolean) {
        getPreferences(MODE_PRIVATE).edit().putBoolean("enabled", enabled).apply()
    }

    private fun showAccessibilityDialog() {
        AlertDialog.Builder(this)
            .setTitle("Enable Accessibility Service")
            .setMessage("SAFNEX NOVA needs accessibility permission to detect links in other apps.\n\n1. Find SAFNEX NOVA in the list\n2. Toggle it ON\n3. Confirm")
            .setPositiveButton("Open Settings") { _, _ ->
                openAccessibilitySettings()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showOverlayDialog() {
        AlertDialog.Builder(this)
            .setTitle("Enable Overlay Permission")
            .setMessage("SAFNEX NOVA needs permission to show popups over other apps to check links.")
            .setPositiveButton("Open Settings") { _, _ ->
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun openAccessibilitySettings() {
        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    }
}
