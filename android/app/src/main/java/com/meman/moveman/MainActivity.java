package com.meman.moveman;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebView webView = getBridge().getWebView();
        if (webView != null) {
            // Android 네이티브 인쇄 인터페이스 등록
            webView.addJavascriptInterface(new PrintInterface(this, webView), "AndroidPrinter");

            // 페이지 로드 시 window.print()를 AndroidPrinter로 자동 연결하는 스크립트 주입
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
}
