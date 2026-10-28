$ErrorActionPreference='Stop'
$urls=Get-Content migration-audit-urls.json -Raw | ConvertFrom-Json
$assets=@{}
$rows=@()
foreach($url in $urls){
 try{
 $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 25
 $h=$r.Content
 $canonical=[regex]::Match($h,'<link[^>]*rel="canonical"[^>]*>').Value
 $robots=[regex]::Match($h,'<meta[^>]*name="robots"[^>]*>').Value
 $lang=[regex]::Match($h,'<html[^>]*lang="[^"]+"').Value
 $dev=[regex]::Matches($h,'.{0,70}dev\.imholz\.at.{0,130}') | ForEach-Object {$_.Value}
 $mixed=[regex]::Matches($h,'(?:src|href)=["'']http://[^"'']+') | ForEach-Object {$_.Value}
 foreach($m in [regex]::Matches($h,'(?:src|href)=["'']([^"'']+)["'']')){
 $v=[Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
 if($v -match '\.(css|js|svg|png|jpe?g|avif|webp|woff2?)(\?|$)'){
 $a=[uri]::new([uri]$url,$v).AbsoluteUri
 if($a -match '^https://imholz.at/'){$assets[$a]=$true}
 }
 }
 $rows += [pscustomobject]@{url=$url;status=[int]$r.StatusCode;lang=$lang;canonical=$canonical;robots=$robots;dev=$dev;mixed=$mixed;forms=([regex]::Matches($h,'<form\b').Count);hreflang=([regex]::Matches($h,'<link[^>]*hreflang[^>]*>')|ForEach-Object {$_.Value})}
 }catch{$rows += [pscustomobject]@{url=$url;error=$_.Exception.Message}}
}
$checks=@()
foreach($url in $assets.Keys){try{$r=Invoke-WebRequest -UseBasicParsing -Method Head -Uri $url -TimeoutSec 20;$checks += [pscustomobject]@{url=$url;status=[int]$r.StatusCode;type=$r.Headers['Content-Type']}}catch{$checks += [pscustomobject]@{url=$url;error=$_.Exception.Message}}}
$extra=@()
foreach($url in @('https://imholz.at/robots.txt','https://imholz.at/sitemap_index.xml','https://imholz.at/page-sitemap.xml','https://dev.imholz.at/robots.txt','http://imholz.at/','https://www.imholz.at/','https://imholz.at/migration-check-nonexistent-20261028/')){try{$r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 20;$extra += [pscustomobject]@{url=$url;status=[int]$r.StatusCode;final=$r.BaseResponse.ResponseUri.AbsoluteUri;body=if($url -match 'txt|xml'){$r.Content}else{''};headers=($r.Headers|ConvertTo-Json -Compress)}}catch{$extra += [pscustomobject]@{url=$url;error=$_.Exception.Message}}}
@{pages=$rows;assets=$checks;extra=$extra}|ConvertTo-Json -Depth 8 | Set-Content migration-audit-results.json -Encoding UTF8
[pscustomobject]@{pages=$rows.Count;pageErrors=@($rows|Where-Object error);devReferences=@($rows|Where-Object dev);mixed=@($rows|Where-Object mixed);assets=$checks.Count;assetErrors=@($checks|Where-Object error);extra=$extra}|ConvertTo-Json -Depth 7
