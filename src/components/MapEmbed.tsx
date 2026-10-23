import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Text, View } from 'react-native'
import { WebView } from 'react-native-webview'

import { GOOGLE_MAPS_EMBED_KEY } from '@/constants/constants'

/**
 * Google Maps Embed search for `query`, rendered as an iframe inside local HTML (the Maps Embed API
 * refuses to load outside an iframe). Without EXPO_PUBLIC_GOOGLE_MAPS_API_KEY it shows a
 * placeholder instead of a broken map. Fills its parent: the caller sizes and rounds the frame.
 */
export function MapEmbed({ query }: { query: string }) {
  if (!GOOGLE_MAPS_EMBED_KEY) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-white">
        <MaterialIcons name="map" size={26} color="#6B7A85" />
        <Text className="font-hanken text-muted text-xs">Mapa indisponível</Text>
      </View>
    )
  }

  const src =
    `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(GOOGLE_MAPS_EMBED_KEY)}` +
    `&q=${encodeURIComponent(query)}&zoom=14`

  return (
    <WebView
      originWhitelist={['*']}
      source={{
        html: `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe
    src="${src}"
    allowfullscreen
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade">
  </iframe>
</body>
</html>`,
      }}
      style={{ flex: 1 }}
      javaScriptEnabled
    />
  )
}
