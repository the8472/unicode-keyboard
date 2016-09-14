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
    
    let start = input.selectionStart;
    let end = input.selectionEnd;
    
    let channel = new MessageChannel();
    
    let m = null
    
    let root = document.documentElement;
    this.oldPadding = root.style.paddingBottom
    
    let frame = document.createElement("iframe")
    
    this.frame = frame;
    
    frame.src = browser.extension.getURL("web/keyboard.html");
    frame.addEventListener("load", () => {
      frame.focus()
      frame.contentWindow.postMessage("inject", "*", [channel.port1])
    })
    
    channel.port2.onmessage = (e) => {
      let data = e.data
      
      if("match" in data) {
        m = data.match;
      }
        

      if("insert" in data) {
        if(m) {
          let str = String.fromCodePoint(("0x"+ m.cp)|0);
          input.setSelectionRange(start, end);
          input.setRangeText(str, start, end, "end");
          start = input.selectionStart;
          end = input.selectionEnd;
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


