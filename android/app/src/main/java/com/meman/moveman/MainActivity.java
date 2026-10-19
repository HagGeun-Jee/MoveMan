package com.meman.moveman;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.KeyEvent;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // 삼성 키보드 및 한글 입력 시 ACTION_MULTIPLE이 발생했을 때
        // 기본 WebView로 직접 전달하여 커서 위치에 정상 입력되도록 보장
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebView webView = getBridge().getWebView();
        if (webView != null) {
            // 0. 크롬 모바일 브라우저와 100% 호환되면서도 앱 공식 버전을 즉시 인식할 수 있는 User-Agent 설정
            String rawUa = webView.getSettings().getUserAgentString();
            if (rawUa != null) {
                String chromeUa = rawUa.replace("; wv", "").replaceAll("Version/\\d+\\.\\d+\\s*", "");
                String appVer = "1.0.0";
                try {
                    appVer = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                } catch (Exception e) {}
                webView.getSettings().setUserAgentString(chromeUa + " MoveManApp/" + appVer);
            }

            // 1. 웹뷰 캐시 클리어 및 최신 코드 즉시 로드
            webView.clearCache(true);
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDefaultTextEncodingName("UTF-8");
            webView.getSettings().setTextZoom(100);

            // 1. Android 네이티브 인쇄 인터페이스 등록
            webView.addJavascriptInterface(new PrintInterface(this, webView), "AndroidPrinter");

            // 2. Android 네이티브 다운로드 인터페이스 등록
            webView.addJavascriptInterface(new DownloadInterface(this), "AndroidDownloader");

            // 3. Android 네이티브 앱 종료 인터페이스 등록
            webView.addJavascriptInterface(new AppInterface(this), "AndroidApp");

            // 4. Android 하드웨어/제스처 뒤로가기 버튼 처리
            getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    WebView currentWebView = getBridge().getWebView();
                    if (currentWebView != null) {
                        currentWebView.evaluateJavascript(
                            "(function() {" +
                            "  if (typeof window.handleAndroidBackButton === 'function') {" +
                            "    return window.handleAndroidBackButton();" +
                            "  }" +
                            "  return false;" +
                            "})();",
                            new ValueCallback<String>() {
                                @Override
                                public void onReceiveValue(String value) {
                                    // 웹뷰에서 처리하지 않았거나 "false" 반환 시 기본 동작
                                    if (!"true".equals(value)) {
                                        setEnabled(false);
                                        getOnBackPressedDispatcher().onBackPressed();
                                        setEnabled(true);
                                    }
                                }
                            }
                        );
                    } else {
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                        setEnabled(true);
                    }
                }
            });

            // 3. WebView 자체 파일 다운로드 리스너 연결 (모바일 브라우저/시스템 다운로더로 Intent 위임)
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setData(Uri.parse(url));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });

            // 4. 페이지 로드 시 window.print() 자동 연결
            webView.evaluateJavascript(
                "(function() {" +
                "  if (window.AndroidPrinter && !window._nativePrintOverridden) {" +
                "    window._nativePrintOverridden = true;" +
                "    window.print = function() { window.AndroidPrinter.print('MEMAN_인쇄_' + Date.now()); };" +
                "  }" +
                "})();",
                null
            );
        }
    }

    public static class PrintInterface {
        private final Context context;
        private final WebView webView;

        public PrintInterface(Context context, WebView webView) {
            this.context = context;
            this.webView = webView;
        }

        @JavascriptInterface
        public void print(final String jobName) {
            webView.post(new Runnable() {
                @Override
                public void run() {
                    PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
                    if (printManager != null) {
                        String name = (jobName != null && !jobName.isEmpty()) ? jobName : "MEMAN_문서";
                        PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(name);
                        printManager.print(name, printAdapter, new PrintAttributes.Builder().build());
                    }
                }
            });
        }
    }

    public static class DownloadInterface {
        private final Context context;

        public DownloadInterface(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void download(final String url) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public static class AppInterface {
        private final MainActivity activity;

        public AppInterface(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void clearSessionAndExit() {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
                        cookieManager.removeAllCookies(new android.webkit.ValueCallback<Boolean>() {
                            @Override
                            public void onReceiveValue(Boolean aBoolean) {
                                try {
                                    cookieManager.flush();
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }
                                activity.finishAffinity();
                                System.exit(0);
                            }
                        });
                    } catch (Exception e) {
                        e.printStackTrace();
                        activity.finishAffinity();
                        System.exit(0);
                    }
                }
            });
        }

        @JavascriptInterface
        public void exitApp() {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        android.webkit.CookieManager.getInstance().flush();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    activity.finishAffinity();
                    System.exit(0);
                }
            });
        }

        @JavascriptInterface
        public boolean isNative() {
            return true;
        }

        @JavascriptInterface
        public String getNativeVersion() {
            try {
                android.content.pm.PackageInfo pInfo = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
                return pInfo.versionName != null ? pInfo.versionName : "1.0.0";
            } catch (Exception e) {
                return "1.0.0";
            }
        }
    }
}
