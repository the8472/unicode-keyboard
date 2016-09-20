"use strict";

let keyb;

browser.runtime.onMessage.addListener(message => {
  if(message == "toggle-keyboard")
    keyb.toggle();
})


class Keyboard {
  constructor() {
    
  }
  
  open() {
    let input = document.activeElement
    if(this.isOpen || !("selectionStart" in input))
      return;
    this.isOpen = true;
    this.input = input;
    
    let channel = new MessageChannel();
    
    let m = null
    
    let root = document.documentElement;
    this.oldPadding = root.style.paddingBottom
    
    let frame = document.createElement("iframe")
    
    this.frame = frame;
    
    frame.src = browser.extension.getURL("web/keyboard.html");
    frame.addEventListener("load", () => {
      frame.focus()
      browser.storage.local.get("session-secret").then(data => {
        frame.contentWindow.postMessage({inject: data[0]["session-secret"]}, "*", [channel.port1])
      })
    })
    
    channel.port2.onmessage = (e) => {
      let data = e.data
      
      if("match" in data) {
        m = data.match;
      }
        

      if("insert" in data) {
        if(m) {
          let str = String.fromCodePoint(m.cp);
          input.setRangeText(str, input.selectionStart, input.selectionEnd, "end");
        }
      }
        
      if("close" in data) {
        this.close()
      }
    }

    frame.style = `
      position: fixed;
      bottom: 0px;
      left: 0px;
      width: available;
      width: -moz-available;
      height: 50vh;
      border: none;
      margin: 0;
    `
      
    root.appendChild(frame)
    frame.focus()
    root.style.paddingBottom = "50vh";
    root.scrollTop = root.scrollTop + 0.5* root.clientHeight
    
  }
  
  close() {
    if(!this.isOpen)
      return;
    this.frame.remove()
    this.isOpen = false;
    document.documentElement.style.paddingBottom = this.oldPadding;
    this.input.focus()

    
  }
  
  toggle() {
    this.isOpen ? this.close() : this.open()
  }
}

keyb = new Keyboard();


