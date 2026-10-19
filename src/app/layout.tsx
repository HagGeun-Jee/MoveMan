import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "MOVEMAN - 이사견적 관리 시스템",
  description: "MOVEMAN 이사견적 관리 시스템",
};

import { AndroidImeFix } from "@/components/AndroidImeFix";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased print:h-auto`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function patchProto(proto) {
                  try {
                    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
                    if (!desc || !desc.set || desc._imePatched) return;
                    var originalSet = desc.set;
                    var originalGet = desc.get;
                    Object.defineProperty(proto, 'value', {
                      set: function(val) {
                        var str = val === null || val === undefined ? '' : String(val);
                        if (this.value === str) {
                          return;
                        }
                        var isFocused = document.activeElement === this;
                        var start = isFocused && typeof this.selectionStart === 'number' ? this.selectionStart : null;
                        var end = isFocused && typeof this.selectionEnd === 'number' ? this.selectionEnd : null;
                        originalSet.call(this, val);
                        if (isFocused && start !== null && end !== null) {
                          try {
                            if (start <= str.length && end <= str.length) {
                              this.setSelectionRange(start, end);
                            }
                          } catch(e) {}
                        }
                      },
                      get: originalGet,
                      configurable: true,
                      enumerable: desc.enumerable,
                      _imePatched: true
                    });
                  } catch(e) {}
                }
                patchProto(HTMLInputElement.prototype);
                patchProto(HTMLTextAreaElement.prototype);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col print:block">
        <AndroidImeFix />
        {children}
      </body>
    </html>
  );
}
