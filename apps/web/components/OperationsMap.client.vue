<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'

import type { MapMarker, MapMarkerTone, MapRoute, MapRouteTone } from '~/utils/maps'
import { createGuardianMapStyle } from '~/utils/maps'

const props = withDefaults(
  defineProps<{
    center?: [number, number] | null
    markers: MapMarker[]
    routes?: MapRoute[]
    selectedMarkerId?: string | null
    zoom?: number
    className?: string
  }>(),
  {
    center: null,
    routes: () => [],
    selectedMarkerId: null,
    zoom: 11,
    className: 'h-[440px]'
  }
)

const mapElement = ref<HTMLElement | null>(null)
let maplibre: typeof import('maplibre-gl') | null = null
let map: import('maplibre-gl').Map | null = null
let markerInstances: import('maplibre-gl').Marker[] = []
let routeLayerIds: string[] = []
let routeSourceIds: string[] = []

const toneClasses: Record<MapMarkerTone, string> = {
  client: 'bg-stone-950 text-white ring-white/80',
  provider: 'bg-sky-600 text-white ring-sky-100/70',
  admin: 'bg-violet-600 text-white ring-violet-100/70',
  active: 'bg-emerald-500 text-stone-950 ring-emerald-100/80',
  pending: 'bg-amber-400 text-stone-950 ring-amber-100/80'
}

const routePaints: Record<MapRouteTone, { color: string; width: number; opacity: number }> = {
  primary: { color: '#111111', width: 5, opacity: 0.9 },
  muted: { color: '#64748b', width: 4, opacity: 0.75 },
  alert: { color: '#dc2626', width: 5, opacity: 0.88 }
}

function clearMarkers() {
  for (const marker of markerInstances) {
    marker.remove()
  }

  markerInstances = []
}

function clearRoutes() {
  if (!map) {
    return
  }

  for (const layerId of routeLayerIds) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
  }

  for (const sourceId of routeSourceIds) {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId)
    }
  }

  routeLayerIds = []
  routeSourceIds = []
}

function syncMarkers() {
  if (!map || !maplibre) {
    return
  }

  clearMarkers()

  for (const marker of props.markers) {
    const selected = marker.id === props.selectedMarkerId
    const tone = marker.tone ?? 'client'
    const element = document.createElement('button')

    element.type = 'button'
    element.className = [
      'group relative grid h-10 min-w-10 place-items-center rounded-full px-3 text-[11px] font-semibold shadow-lg ring-4 transition-transform duration-150',
      toneClasses[tone],
      selected ? 'scale-110' : 'hover:scale-105'
    ].join(' ')

    element.innerHTML = `<span>${marker.label}</span>`

    const popup = new maplibre.Popup({
      closeButton: false,
      offset: 18,
      className: 'guardian-map-popup'
    }).setHTML(
      `<div class="space-y-1"><p class="text-sm font-semibold text-stone-900">${marker.label}</p>${
        marker.detail ? `<p class="text-xs text-stone-600">${marker.detail}</p>` : ''
      }</div>`
    )

    const instance = new maplibre.Marker({ element, anchor: 'center' })
      .setLngLat([marker.longitude, marker.latitude])
      .setPopup(popup)
      .addTo(map)

    if (selected) {
      instance.togglePopup()
    }

    markerInstances.push(instance)
  }
}

function syncRoutes() {
  if (!map) {
    return
  }

  clearRoutes()

  for (const route of props.routes) {
    const sourceId = `route-source-${route.id}`
    const casingLayerId = `route-casing-${route.id}`
    const lineLayerId = `route-line-${route.id}`
    const paint = routePaints[route.tone ?? 'primary']

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: route.coordinates
        },
        properties: {}
      }
    })

    map.addLayer({
      id: casingLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#ffffff',
        'line-width': paint.width + 4,
        'line-opacity': Math.min(1, paint.opacity)
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    })

    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': paint.color,
        'line-width': paint.width,
        'line-opacity': paint.opacity
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    })

    routeSourceIds.push(sourceId)
    routeLayerIds.push(casingLayerId, lineLayerId)
  }
}

function fitViewport() {
  if (!map || !maplibre) {
    return
  }

  const routeCoordinates = props.routes.flatMap((route) => route.coordinates)
  const markerCoordinates = props.markers.map((marker) => [marker.longitude, marker.latitude] as [number, number])
  const coordinates = [...routeCoordinates, ...markerCoordinates]

  if (coordinates.length > 1) {
    const bounds = new maplibre.LngLatBounds()

    for (const coordinate of coordinates) {
      bounds.extend(coordinate)
    }

    map.fitBounds(bounds, {
      padding: 72,
      duration: 600,
      maxZoom: props.routes.length ? 14 : 13
    })

    return
  }

  const focus = markerCoordinates[0] ?? routeCoordinates[0]

  if (focus) {
    map.flyTo({
      center: focus,
      zoom: Math.max(props.zoom, 12),
      essential: true,
      duration: 700
    })

    return
  }

  if (props.center) {
    map.flyTo({
      center: props.center,
      zoom: props.zoom,
      essential: true,
      duration: 700
    })
  }
}

function syncMapState() {
  if (!map || !maplibre || !map.isStyleLoaded()) {
    return
  }

  syncRoutes()
  syncMarkers()
  fitViewport()
}

onMounted(async () => {
  if (!mapElement.value) {
    return
  }

  maplibre = await import('maplibre-gl')

  map = new maplibre.Map({
    container: mapElement.value,
    style: createGuardianMapStyle() as any,
    center: props.center ?? [18.4241, -33.9249],
    zoom: props.zoom,
    attributionControl: false
  })

  map.addControl(
    new maplibre.AttributionControl({
      compact: true
    }),
    'bottom-right'
  )

  map.addControl(
    new maplibre.NavigationControl({
      visualizePitch: true,
      showCompass: false
    }),
    'top-right'
  )

  map.on('load', () => {
    syncMapState()
  })
})

watch(
  () => [props.markers, props.routes, props.center, props.selectedMarkerId, props.zoom],
  () => {
    syncMapState()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  clearMarkers()
  clearRoutes()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="relative overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-sm">
    <div ref="mapElement" :class="className" />
    <div class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f4f2ee]/70 to-transparent" />
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f4f2ee]/75 to-transparent" />
  </div>
</template>
