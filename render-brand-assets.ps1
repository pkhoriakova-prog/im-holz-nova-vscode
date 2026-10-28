$ErrorActionPreference = 'Stop'
$assetDir = Join-Path (Get-Location) 'identity-assets'
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null
$svgSource = [IO.File]::ReadAllText((Join-Path (Get-Location) 'images\logos\logo-green.svg'))
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($svgSource))
$html = @'
<!doctype html><html><head><meta charset="utf-8"></head><body><script>
const original=atob('SVG_BASE64');
async function render(svg,size,pad){const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(svg);await img.decode();const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,size,size);const scale=Math.min((size-2*pad)/img.width,(size-2*pad)/img.height);x.drawImage(img,(size-img.width*scale)/2,(size-img.height*scale)/2,img.width*scale,img.height*scale);return c.toDataURL('image/png').split(',')[1]}
(async()=>{const doc=new DOMParser().parseFromString(original,'image/svg+xml');const root=doc.documentElement;const mark=root.querySelector('g > g > g');[...mark.children].slice(0,5).forEach(n=>n.remove());const only=document.createElementNS('http://www.w3.org/2000/svg','svg');only.setAttribute('xmlns','http://www.w3.org/2000/svg');only.setAttribute('viewBox','44.11 -4.48 44 44');only.setAttribute('width','512');only.setAttribute('height','512');only.setAttribute('fill','#014335');only.append(mark.cloneNode(true));const icon=new XMLSerializer().serializeToString(only);const data={icon:await render(icon,512,0),logo:await render(original,1024,64)};const p=document.createElement('pre');p.id='assets';p.textContent=JSON.stringify(data);document.body.append(p)})();
</script></body></html>
'@
$html=$html.Replace('SVG_BASE64',$encoded)
$inputPath=Join-Path $assetDir 'render.html'
[IO.File]::WriteAllText($inputPath,$html)
$out=Join-Path $assetDir 'render.dom'
$profile=Join-Path $assetDir 'chrome-profile'
$args=@('--headless=new','--disable-gpu','--no-first-run',('--user-data-dir="'+$profile+'"'),'--virtual-time-budget=3000','--dump-dom',('"file:///'+$inputPath.Replace('\','/')+'"'))
$p=Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList $args -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError (Join-Path $assetDir 'render.log') -PassThru
$p.WaitForExit()
for($i=0;$i -lt 30;$i++){try{$dom=[IO.File]::ReadAllText($out);$m=[regex]::Match($dom,'<pre id="assets">(.*?)</pre>');if($m.Success){break}}catch{};Start-Sleep -Milliseconds 500}
if(-not $m.Success){throw 'Brand rendering did not finish'}
$result=[Net.WebUtility]::HtmlDecode($m.Groups[1].Value)|ConvertFrom-Json
[IO.File]::WriteAllBytes((Join-Path $assetDir 'im-holz-nova-site-icon.png'),[Convert]::FromBase64String($result.icon))
[IO.File]::WriteAllBytes((Join-Path $assetDir 'im-holz-nova-organization-logo.png'),[Convert]::FromBase64String($result.logo))
Get-ChildItem -LiteralPath $assetDir -Filter '*.png' | Select-Object Name,Length
