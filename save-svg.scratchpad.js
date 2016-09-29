var canvas = document.createElementNS("http://www.w3.org/1999/xhtml",'canvas');
var rect = document.documentElement.getBoundingClientRect()
canvas.width = rect.width
canvas.height = rect.height
var ctx = canvas.getContext('2d');

var data = document.documentElement.outerHTML;



var img = new Image();
var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
var url = URL.createObjectURL(svg);

img.onload = function () {
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  canvas.toBlob(function(blob){
    let link = document.createElementNS("http://www.w3.org/1999/xhtml",'a')
    link.href = URL.createObjectURL(blob);
    link.download = `${canvas.width}.png`
    document.documentElement.appendChild(link)
    link.click()
  }, "image/png")
}

img.src = url;