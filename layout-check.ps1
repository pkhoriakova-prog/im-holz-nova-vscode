param([string[]]$Slugs = @('','nachhaltigkeit','ueber-uns','einblicke','loesung-konstruktionsholz','einblicke-cee-sustainable-finance-summit-2026','einblicke-gef-versammlung-samarkand-2026','einblicke-buildn-green-2026','einblicke-dubai-wood-show-2025','impressum'), [int[]]$Widths = @(1280,1920))
$ErrorActionPreference = 'Stop'
$taskDir = Join-Path (Get-Location) 'layout-review'
New-Item -ItemType Directory -Force -Path $taskDir | Out-Null
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$measure = @'
<style>*{animation:none!important;transition:none!important}</style><script>
window.addEventListener('load',async()=>{await document.fonts.ready;setTimeout(()=>{
const results=[...document.querySelectorAll('h1,h2,h3,h4')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{const r=document.createRange();r.selectNodeContents(e);const rects=[...r.getClientRects()].filter(r=>r.width>0&&r.height>0);const tops=[];for(const r of rects)if(!tops.some(t=>Math.abs(t-r.top)<3))tops.push(r.top);return {tag:e.tagName,text:e.innerText.replace(/\s+/g,' ').trim(),lines:tops.length,width:Math.round(e.getBoundingClientRect().width),font:getComputedStyle(e).fontSize}});const p=document.createElement('pre');p.id='layout-results';p.textContent=JSON.stringify(results);document.body.append(p);},400)});
</script>
'@
foreach($slug in $Slugs){
 $url = 'https://dev.imholz.at/'+$slug+'/'
 $html = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
 $html = $html.Replace('<head>','<head><base href="https://dev.imholz.at/">').Replace('</body>',$measure+'</body>')
 $local = Join-Path $taskDir ($slug+'.html')
 [IO.File]::WriteAllText($local,$html,[Text.UTF8Encoding]::new($false))
 foreach($width in $Widths){
  $out = Join-Path $taskDir ($slug+'-'+$width+'.dom')
  $errFile = Join-Path $taskDir ($slug+'-'+$width+'.log')
  $shot = Join-Path $taskDir ($slug+'-'+$width+'.png')
  $args = @('--headless=new','--disable-gpu','--no-first-run','--hide-scrollbars',('--user-data-dir="'+(Join-Path $taskDir 'chrome-profile')+'"'),('--window-size='+$width+',1000'),'--virtual-time-budget=5000','--dump-dom',('--screenshot="'+$shot+'"'),('"file:///'+$local.Replace('\','/')+'"'))
  $p = Start-Process -FilePath $chrome -ArgumentList $args -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $errFile -PassThru
  $p.WaitForExit()
  $dom = ''
  for($attempt=0;$attempt -lt 30;$attempt++){
   try{$dom = [IO.File]::ReadAllText($out);if($dom.Contains('<pre id="layout-results">')){break}}catch{}
   Start-Sleep -Milliseconds 500
  }
  $match = [regex]::Match($dom,'<pre id="layout-results">(.*?)</pre>','Singleline')
  if($match.Success){$json=[Net.WebUtility]::HtmlDecode($match.Groups[1].Value);[IO.File]::WriteAllText((Join-Path $taskDir ($slug+'-'+$width+'.json')),$json);$items=$json|ConvertFrom-Json;[pscustomobject]@{Page=$slug;Width=$width;Headings=($items|Where-Object {$_.tag -eq 'H1' -or $_.lines -gt 2}|ConvertTo-Json -Compress)}}else{Write-Output ('No measurements: '+$slug+' '+$width)}
 }
}
