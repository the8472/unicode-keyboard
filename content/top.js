"use strict";

let keyb;

browser.runtime.onMessage.addListener(message => {
  if(message["close"])
    keyb.close();
    
  if(message["toggle-keyboard"])
    keyb.toggle();
})


class Keyboard {
  constructor() {
    
  }
  
  insertStyle() {
    if(this.styleInserted)
      return;
    this.styleInserted = true;
    document.head.insertAdjacentHTML("beforeend", `<style>
        :root.uni-kbd-active { display: flex; height:100vh; overflow-y: hidden; flex-direction: column;}
        :root.uni-kbd-active > * {max-height: 50vh; overflow-y: auto;}
        iframe.uni-kbd {
          width: available;
          width: -moz-available;
          min-height: 50vh;
          border: none;
          margin: 0;
        }
    </style>`)
  }
  
  open() {
    if(this.isOpen)
      return;
    this.insertStyle();
    this.isOpen = true;
    
  
  
    let root = document.documentElement;
    root.classList.add("uni-kbd-active")
    
    let frame = document.createElement("iframe")
    
    this.frame = frame;
    frame.classList.add("uni-kbd")
    frame.src = browser.extension.getURL("web/keyboard.html");
    frame.addEventListener("load", () => {
      frame.focus()
      browser.runtime.sendMessage({broadcast: {keyboardEnabled: true}})
    })
    

      
    root.appendChild(frame)
    document.activeElement.scrollIntoView({block: "end"});
    frame.focus()
   
  }
  

  
  close() {
    if(!this.isOpen)
      return;
    browser.runtime.sendMessage({broadcast: {restoreFocus: true}}).then(() => {
      let scroller = Array.from(document.documentElement.children).find(e => e.scrollTop > 0);
      let sTop = scroller && scroller.scrollTop
      this.frame.remove()      
      browser.runtime.sendMessage({broadcast: {keyboardEnabled: false}})
      document.documentElement.classList.remove("uni-kbd-active")
      if(sTop)
        document.documentElement.scrollTop = sTop;
      this.isOpen = false;
      //document.documentElement.style.paddingBottom = this.oldPadding;
    })
  }
  
  toggle() {
    if(!this.isOpen) {
      this.open();
      return;
    } 
    
    if(this.frame == document.activeElement) {
      this.close()
      return;
    }
    
    this.frame.focus()
  }
}

keyb = new Keyboard();


