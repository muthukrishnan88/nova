package com.safnex.nova

import com.google.gson.Gson
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

object ApiClient {

    // Change this to your deployed backend URL
    private const val API_BASE_URL = "https://safnex-nova.onrender.com"

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    fun analyzeLink(url: String): LinkAnalysisResult {
        val json = """{"url":"$url"}"""
        val body = json.toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url("$API_BASE_URL/api/analyze")
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("API request failed: ${response.code}")
            }

            val responseBody = response.body?.string()
                ?: throw Exception("Empty response")

            // Parse response
            val apiResponse = gson.fromJson(responseBody, ApiResponse::class.java)

            if (!apiResponse.ok) {
                throw Exception(apiResponse.error ?: "Analysis failed")
            }

            val result = apiResponse.result ?: throw Exception("No result in response")

            return LinkAnalysisResult(
                risk = result.risk ?: "unknown",
                score = result.score ?: 0,
                reasons = result.reasons ?: emptyList()
            )
        }
    }

    private data class ApiResponse(
        val ok: Boolean,
        val result: ApiResult?,
        val error: String?
    )

    private data class ApiResult(
        val risk: String?,
        val score: Int?,
        val reasons: List<String>?
    )
}
