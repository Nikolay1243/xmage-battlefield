import Cocoa
import WebKit
import AVFoundation

guard CommandLine.arguments.count > 1, let gameURL = URL(string: CommandLine.arguments[1]), gameURL.scheme == "http", gameURL.host == "127.0.0.1" else {
    let alert = NSAlert(); alert.messageText = "Open Battlefield from XMage"; alert.informativeText = "Join a game in XMage and click Modern battlefield."; alert.runModal(); exit(0)
}
// Client-owned GPU web view. Only the per-game loopback origin may navigate here.
final class Battlefield: NSObject, NSApplicationDelegate, WKNavigationDelegate, NSWindowDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var web: WKWebView!
    var attentionPlayer: AVAudioPlayer?
    let url = URL(string: CommandLine.arguments[1])!
    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "fullscreen")
        config.userContentController.add(self, name: "attention")
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.setValue(false, forKey: "drawsBackground")
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1920, height: 1080), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Xmage Battlefield"
        window.minSize = NSSize(width: 1100, height: 700)
        window.contentView = web
        window.delegate = self
        window.backgroundColor = NSColor(calibratedRed: 0.05, green: 0.08, blue: 0.06, alpha: 1)
        window.center()
        window.makeKeyAndOrderFront(nil)
        window.makeFirstResponder(web)
        web.load(URLRequest(url: url))
        NSApp.activate(ignoringOtherApps: true)
        let menu = NSMenu()
        let item = NSMenuItem(); menu.addItem(item)
        let appMenu = NSMenu(); item.submenu = appMenu
        appMenu.addItem(withTitle: "Quit Battlefield", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        NSApp.mainMenu = menu
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "fullscreen" { window.toggleFullScreen(nil) }
        if message.name == "attention", (!NSApp.isActive || !window.isKeyWindow), let data = message.body as? [String: Any], let volume = data["volume"] as? Double, volume > 0 {
            let file = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("battlefield-sounds/attention.wav")
            do { attentionPlayer = try AVAudioPlayer(contentsOf: file); attentionPlayer?.volume = Float(min(1, max(0, volume))); attentionPlayer?.play() } catch { NSSound.beep() }
        }
    }
    func windowWillClose(_ notification: Notification) { NSApp.terminate(nil) }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let next = navigationAction.request.url else { decisionHandler(.cancel); return }
        decisionHandler(next.scheme == url.scheme && next.host == url.host && next.port == url.port ? .allow : .cancel)
    }
}
let app = NSApplication.shared
let delegate = Battlefield()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
