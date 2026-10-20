<!-- step 1:
extract
press ctrl + a 
press ctrl + x

step 2:
local disk
xampp
htdocs 
create a folder then paste 

sa pag visit ng site is " http://localhost/"NAME OF THE FOLDER"/view/pages/ "



## Dashboard layout (static HTML)

Ang buong dashboard shell (HTML, head, CSS/JS, navbar, sidebar, settings, at
footer) ay nasa `view/layouts/main.html`. Ang mga dashboard page ay content
file lang at nilo-load ng shell gamit ang `?page=`.

Para gumawa ng bagong page, content lamang ang ilagay sa file sa `view/pages`:

```html
<div class="row">
    <div class="col-12">
        <div class="card"><div class="card-body">
            <h4 class="card-title">My page content</h4>
        </div></div>
    </div>
</div>
```

Huwag maglagay ng `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`, navbar,
sidebar, footer, o shared script sa content file.

Halimbawa ng URL: `view/layouts/main.html?page=Inventory`. Idagdag ang page
name at file name sa `pages` object ng `assets/js/layout.js`, pagkatapos ay
gamitin ang parehong `main.html?page=PageName` sa sidebar link.

Ang guard ay nireredirect ang unauthenticated user sa `login.html` kahit
direktang i-type o palitan ang URL ng alinman sa protected dashboard pages.
Ang direktang pag-type ng `login.html` o `register.html` ay nagbabalik sa
canonical landing page; buksan ang mga ito mula sa link sa site. Ang landing
page ang public entry point, at dito rin nagre-redirect ang app root.
Pinapayagan ang refresh at browser back/forward.
Ang tunay na security para sa API/data ay kailangan ding i-enforce sa backend:
ang `localStorage` guard ay hindi sapat laban sa taong manu-manong nagbabago
ng browser storage o direktang tumatawag sa API.

Para gumana ang custom “Page not found” message, buksan ang app gamit ang
Apache/XAMPP, halimbawa `http://localhost/ECOMS/view/pages/home.html`.
Hindi kayang palitan ng HTML/JavaScript ang browser error ng `file:///` URL
kapag ang file ay hindi umiiral.
