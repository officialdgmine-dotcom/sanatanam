package com.example

import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
  var fileUploadCallback: ValueCallback<Array<Uri>>? = null

  val fileChooserLauncher: ActivityResultLauncher<Intent> =
    registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
      if (result.resultCode == RESULT_OK) {
        val data: Intent? = result.data
        val results: Array<Uri>? = when {
          data?.data != null -> arrayOf(data.data!!)
          data?.clipData != null -> {
            val clipData = data.clipData!!
            Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
          }
          else -> null
        }
        fileUploadCallback?.onReceiveValue(results)
      } else {
        fileUploadCallback?.onReceiveValue(null)
      }
      fileUploadCallback = null
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme(dynamicColor = false) {
        SanatanamWebViewScreen(
          onOpenFileChooser = { callback, fileChooserParams ->
            fileUploadCallback?.onReceiveValue(null)
            fileUploadCallback = callback
            val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
              type = "image/*"
              addCategory(Intent.CATEGORY_OPENABLE)
            }
            try {
              fileChooserLauncher.launch(intent)
              true
            } catch (e: Exception) {
              fileUploadCallback = null
              false
            }
          }
        )
      }
    }
  }
}

class AndroidBridge(
  private val context: Context,
  private val onRegister: () -> Unit,
  private val onLogin: () -> Unit,
  private val onAuthSuccess: (token: String, userDataJson: String) -> Unit,
  private val onOpenNativeScreen: (screenName: String) -> Unit,
  private val onLanguageSelected: (String) -> Unit
) {
  @JavascriptInterface
  fun onRegisterClick() {
    onRegister()
  }

  @JavascriptInterface
  fun onLoginClick() {
    onLogin()
  }

  @JavascriptInterface
  fun onAuthSuccess(token: String, userDataJson: String) {
    onAuthSuccess.invoke(token, userDataJson)
  }

  @JavascriptInterface
  fun openNativeScreen(screenName: String) {
    onOpenNativeScreen.invoke(screenName)
  }

  @JavascriptInterface
  fun openExternalUrl(url: String) {
    try {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    } catch (e: Exception) {
      (context as? ComponentActivity)?.runOnUiThread {
        Toast.makeText(context, "URL खोलने में त्रुटि: ${e.message}", Toast.LENGTH_SHORT).show()
      }
    }
  }

  @JavascriptInterface
  fun onLanguageSelected(langCode: String) {
    onLanguageSelected.invoke(langCode)
  }

  @JavascriptInterface
  fun saveBase64File(base64Data: String, filename: String, mimeType: String) {
    try {
      val pureBase64 = if (base64Data.contains(",")) {
        base64Data.substringAfter(",")
      } else {
        base64Data
      }
      val decodedBytes = Base64.decode(pureBase64, Base64.DEFAULT)

      var outputStream: OutputStream? = null

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val contentValues = ContentValues().apply {
          put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
          put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
          if (mimeType.startsWith("image/")) {
            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Sanatanam")
          } else {
            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Sanatanam")
          }
        }
        val collectionUri = if (mimeType.startsWith("image/")) {
          MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        } else {
          MediaStore.Downloads.EXTERNAL_CONTENT_URI
        }
        val itemUri = context.contentResolver.insert(collectionUri, contentValues)
        if (itemUri != null) {
          outputStream = context.contentResolver.openOutputStream(itemUri)
        }
      } else {
        val targetDir = if (mimeType.startsWith("image/")) {
          File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Sanatanam")
        } else {
          File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Sanatanam")
        }
        if (!targetDir.exists()) {
          targetDir.mkdirs()
        }
        val file = File(targetDir, filename)
        outputStream = FileOutputStream(file)
      }

      outputStream?.use { it.write(decodedBytes) }

      (context as? ComponentActivity)?.runOnUiThread {
        Toast.makeText(context, "फ़ाइल सफलतापूर्वक सुरक्षित की गई: $filename", Toast.LENGTH_LONG).show()
      }
    } catch (e: Exception) {
      (context as? ComponentActivity)?.runOnUiThread {
        Toast.makeText(context, "डाउनलोड सुरक्षित करने में त्रुटि: ${e.message}", Toast.LENGTH_LONG).show()
      }
    }
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun SanatanamWebViewScreen(
  onOpenFileChooser: (ValueCallback<Array<Uri>>, WebChromeClient.FileChooserParams?) -> Boolean
) {
  val context = LocalContext.current
  var webViewRef by remember { mutableStateOf<WebView?>(null) }

  BackHandler(enabled = true) {
    val wv = webViewRef
    if (wv != null && wv.canGoBack()) {
      wv.goBack()
    } else {
      wv?.evaluateJavascript(
        "if (typeof currentStep !== 'undefined' && currentStep > 1) { navigateStep(-1); 'stepped_back'; } else { 'at_root'; }"
      ) { result ->
        if (result == "\"at_root\"" || result == null) {
          (context as? ComponentActivity)?.finish()
        }
      }
    }
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(
        Brush.verticalGradient(
          colors = listOf(
            Color(0xFFFF8800),
            Color(0xFFB82E00),
            Color(0xFF4A0000)
          )
        )
      )
      .windowInsetsPadding(WindowInsets.safeDrawing)
  ) {
    AndroidView(
      modifier = Modifier.fillMaxSize(),
      factory = { ctx ->
        WebView(ctx).apply {
          layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
          )

          setBackgroundColor(android.graphics.Color.parseColor("#4A0000"))

          // Use software rendering if hardware rendernode is unavailable on virtualized devices/emulators
          try {
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
          } catch (_: Exception) {
            setLayerType(View.LAYER_TYPE_SOFTWARE, null)
          }

          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            displayZoomControls = false
            builtInZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            loadsImagesAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
          }

          webViewClient = object : WebViewClient() {
            override fun onReceivedSslError(
              view: WebView?,
              handler: SslErrorHandler?,
              error: SslError?
            ) {
              // Proceed with handshake for Samiti server certificates and assets in WebView
              handler?.proceed()
            }

            override fun shouldOverrideUrlLoading(
              view: WebView?,
              request: WebResourceRequest?
            ): Boolean {
              val url = request?.url?.toString() ?: return false
              if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file:///android_asset/")) {
                return false
              }
              // External protocols such as wa.me, tel:, mailto:
              return try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                  addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                ctx.startActivity(intent)
                true
              } catch (e: Exception) {
                false
              }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
              super.onPageFinished(view, url)
              val pageUrl = url?.lowercase() ?: ""
              val isExcluded = pageUrl.contains("welcome_flow") ||
                pageUrl.contains("app_login") ||
                pageUrl.contains("app_register")

              if (!isExcluded) {
                try {
                  val jsCode = ctx.assets.open("footer_nav.js").bufferedReader().use { it.readText() }
                  view?.evaluateJavascript(jsCode, null)
                } catch (e: Exception) {
                  // Ignore if assets read fails
                }
              }
            }
          }

          webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
              webView: WebView?,
              filePathCallback: ValueCallback<Array<Uri>>?,
              fileChooserParams: FileChooserParams?
            ): Boolean {
              return if (filePathCallback != null) {
                onOpenFileChooser(filePathCallback, fileChooserParams)
              } else {
                false
              }
            }
          }

          addJavascriptInterface(
            AndroidBridge(
              context = ctx,
              onRegister = {
                (ctx as? ComponentActivity)?.runOnUiThread {
                  loadUrl("file:///android_asset/app_register.html")
                }
              },
              onLogin = {
                (ctx as? ComponentActivity)?.runOnUiThread {
                  loadUrl("file:///android_asset/app_login.html")
                }
              },
              onAuthSuccess = { token, userDataJson ->
                (ctx as? ComponentActivity)?.runOnUiThread {
                  Toast.makeText(
                    ctx,
                    "सत्यापन सफल! सनातन सेवा समिति में आपका स्वागत है।",
                    Toast.LENGTH_LONG
                  ).show()
                }
              },
              onOpenNativeScreen = { screenName ->
                (ctx as? ComponentActivity)?.runOnUiThread {
                  when (screenName) {
                    "app_register" -> loadUrl("file:///android_asset/app_register.html")
                    "app_login" -> loadUrl("file:///android_asset/app_login.html")
                    "welcome_flow" -> loadUrl("file:///android_asset/welcome_flow.html")
                    "welcome_letter" -> loadUrl("file:///android_asset/welcome_letter.html")
                    else -> {
                      if (screenName.endsWith(".html")) {
                        loadUrl("file:///android_asset/$screenName")
                      } else {
                        loadUrl("file:///android_asset/$screenName.html")
                      }
                    }
                  }
                }
              },
              onLanguageSelected = { _ ->
                // Native callback hook for selected language
              }
            ),
            "AndroidBridge"
          )

          loadUrl("file:///android_asset/index.html")
          webViewRef = this
        }
      },
      update = { webView ->
        webViewRef = webView
      }
    )
  }
}

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
  androidx.compose.material3.Text(text = "Hello $name!", modifier = modifier)
}

