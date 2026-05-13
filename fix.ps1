$content = Get-Content 'src/components/RoutePanel.tsx'

$found = $false

$content = $content | ForEach-Object {

  if ($_ -eq '          </>' -and -not $found) {

    '          </div>'

    $found = $true

  } elseif ($_ -eq '          </>' -and $found) {

    # skip

  } else {

    $_

  }

}

Set-Content 'src/components/RoutePanel.tsx' $content