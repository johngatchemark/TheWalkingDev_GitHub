$lines = Get-Content 'src/components/RoutePanel.tsx'

$index = $lines.Length - 1

while ($index -ge 0) {

  if ($lines[$index] -match '^        \)\}') {

    $lines = $lines[0..($index-1)] + '          </>' + $lines[$index..($lines.Length - 1)]

    break

  }

  $index--

}

Set-Content 'src/components/RoutePanel.tsx' $lines