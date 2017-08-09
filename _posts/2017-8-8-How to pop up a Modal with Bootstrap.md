---
layout: post
title: Bootstrap如何弹出modal窗，并动态传值？
tags: Front-End
---
### Let Code tell you
``` html
<div class="modal fade" id="qrcode" tabindex="-1" role="dialog" aria-labelledby="information">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal">
          <span>&times;</span>
        </button>
        <h4 class="modal-title">请扫描二维码，完成支付</h4>
      </div>
      <div class="modal-body" style="text-align: center">
        <p id="message"></p>
        <img src="" alt="QRCode" id="scan">
      </div>
    </div>
  </div>
</div>
<button id="popup" class="btn  btn-primary btn-lg btn-block">我弹</button>
```

``` javascript
  $(function () {
    $('#popup').on('click', function(){
      $('#qrcode').modal('show');
    });
    $('#qrcode').on('show.bs.modal', function (event) {
      var modal = $(this);  //get modal itself
      modal.find('.modal-body #message').text('your message');
      modal.find('.modal-body #scan').attr("src", 'image src');
    });
  });
```

### What does it look like
![Modal Appearance](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/modal.gif)

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***