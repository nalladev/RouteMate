// custom-charts.typ - Local fork of primaviz grouped-bar-chart with adjustable spacing
#import "@preview/primaviz:0.1.1": *
#import "@preview/primaviz:0.1.1": themes

// Helper function to get color from theme palette
#let get-chart-color(theme, index) = {
  let pal = theme.palette
  pal.at(calc.rem(index, pal.len()))
}

// Helper to resolve theme
#let resolve-chart-theme(user-theme) = {
  let default = (
    palette: (
      rgb("#4e79a7"),
      rgb("#f28e2b"),
      rgb("#e15759"),
      rgb("#76b7b2"),
      rgb("#59a14f"),
      rgb("#edc948"),
      rgb("#b07aa1"),
      rgb("#ff9da7"),
      rgb("#9c755f"),
      rgb("#bab0ac"),
    ),
    title-size: 11pt,
    title-weight: "bold",
    axis-label-size: 7pt,
    axis-title-size: 8pt,
    legend-size: 8pt,
    value-label-size: 8pt,
    axis-stroke: 0.5pt + black,
    axis-padding-left: 40pt,
    axis-padding-bottom: 20pt,
    axis-padding-top: 10pt,
    axis-padding-right: 10pt,
    tick-count: 5,
    number-format: "auto",
    grid-stroke: 0.5pt + luma(230),
    show-grid: false,
    legend-position: "bottom",
    legend-swatch-size: 10pt,
    legend-gap: 10pt,
    title-gap: 5pt,
    text-color: black,
    text-color-light: gray,
    text-color-inverse: white,
    background: none,
    border: none,
    // Custom spacing parameters
    y-axis-label-offset: 5pt,
    y-axis-title-offset: 7pt,
    legend-top-spacing: 5pt,
    y-axis-value-suffix: "",
    value-label-suffix: "",
    y-axis-max: none,
    group-padding-ratio: 0.2,
    bar-gap: 2pt,
  )

  if user-theme == none {
    return default
  }

  let result = (:)
  for (key, val) in default {
    if key in user-theme {
      result.insert(key, user-theme.at(key))
    } else {
      result.insert(key, val)
    }
  }
  result
}

// Draw horizontal legend with adjustable spacing
#let draw-chart-legend(entries, theme) = {
  let swatch-size = theme.legend-swatch-size
  v(theme.legend-top-spacing)
  align(center)[
    #for (i, entry) in entries.enumerate() {
      let name = if type(entry) == str { entry } else { entry.name }
      let color = if type(entry) == dictionary and "color" in entry {
        entry.color
      } else {
        get-chart-color(theme, i)
      }
      box(width: swatch-size, height: swatch-size, fill: color, baseline: 2pt, radius: 2pt)
      h(3pt)
      text(size: theme.legend-size, fill: theme.text-color)[#name]
      h(theme.legend-gap)
    }
  ]
}

// Draw chart title
#let draw-chart-title(title, theme) = {
  if title != none {
    v(theme.title-gap)
    align(center)[
      #text(size: theme.title-size, weight: theme.title-weight, fill: theme.text-color)[#title]
    ]
    v(theme.title-gap)
  }
}

// Draw grid lines
#let draw-chart-grid(x-start, y-start, width, height, theme) = {
  if theme.show-grid {
    for i in range(theme.tick-count) {
      let fraction = if theme.tick-count > 1 { i / (theme.tick-count - 1) } else { 0 }
      let y-pos = height - fraction * (height - 10pt)
      place(
        left + top,
        dx: x-start,
        dy: y-pos,
        line(start: (0pt, 0pt), end: (width, 0pt), stroke: theme.grid-stroke)
      )
    }
  }
}

/// Custom grouped bar chart with adjustable y-axis label and legend spacing
///
/// - data (dictionary): Dict with `labels` and `series` (each with `name` and `values`)
/// - width (length): Chart width
/// - height (length): Chart height
/// - title (none, content): Optional chart title
/// - show-legend (bool): Show series legend
/// - x-label (none, content): X-axis title
/// - y-label (none, content): Y-axis title
/// - theme (none, dictionary): Theme overrides (supports y-axis-label-offset and legend-top-spacing)
/// - show-value-labels (bool): Show values on top of bars
/// -> content
#let custom-grouped-bar-chart(
  data,
  width: 350pt,
  height: 200pt,
  title: none,
  show-legend: true,
  x-label: none,
  y-label: none,
  theme: none,
  show-value-labels: false,
) = {
  let t = resolve-chart-theme(theme)
  let labels = data.labels
  let series = data.series
  let n-groups = labels.len()
  let n-series = series.len()

  let all-values = series.map(s => s.values).flatten()
  let data-max = calc.max(..all-values)
  if data-max == 0 { data-max = 1 }
  let max-val = if t.y-axis-max != none and t.y-axis-max > 0 {
    t.y-axis-max
  } else {
    data-max
  }

  // Calculate dimensions
  let extra-height = 60pt
  let chart-height = height - 20pt
  let chart-width = width - 50pt
  let axis-left = t.axis-padding-left

  box(
    width: width,
    height: height + extra-height,
    fill: t.background,
    stroke: t.border,
  )[
    #draw-chart-title(title, t)
    #box(width: width, height: chart-height)[
      // Draw grid
      #draw-chart-grid(axis-left, 0pt, chart-width, chart-height, t)

      // Y-axis line
      #place(left + top, line(start: (axis-left, 0pt), end: (axis-left, chart-height), stroke: t.axis-stroke))

      // X-axis line
      #place(left + bottom, line(start: (axis-left, 0pt), end: (width, 0pt), stroke: t.axis-stroke))

      // Draw bars
      #let group-width = chart-width / n-groups
      #let group-padding = group-width * t.group-padding-ratio
      #let usable-group-width = group-width - group-padding
      #let bw = (usable-group-width - (n-series - 1) * t.bar-gap) / n-series

      #for (gi, _) in labels.enumerate() {
        for (si, s) in series.enumerate() {
          let val = s.values.at(gi)
          let bar-h = (val / max-val) * (chart-height - 10pt)
          let x-pos = axis-left + gi * group-width + group-padding / 2 + si * (bw + t.bar-gap)
          place(
            left + bottom,
            dx: x-pos,
            rect(
              width: bw,
              height: bar-h,
              fill: get-chart-color(t, si),
              stroke: none,
            )
          )

                // Optional value labels on bars (e.g., 28%) to reduce ambiguity.
                if show-value-labels {
                  let label-y = calc.max(0pt, chart-height - bar-h - 10pt)
                  place(
                    left + top,
                    dx: x-pos,
                    dy: label-y,
                    box(width: bw)[
                      #align(center)[
                        #text(size: t.value-label-size, fill: t.text-color)[#val#t.value-label-suffix]
                      ]
                    ]
                  )
                }
        }

        // X-axis labels
        let x-center = axis-left + gi * group-width + group-width / 2 - 15pt
        place(
          left + bottom,
          dx: x-center,
          dy: 12pt,
          text(size: t.axis-label-size, fill: t.text-color)[#labels.at(gi)]
        )
      }

      // Y-axis labels with custom offset
      #for i in range(t.tick-count) {
        let fraction = if t.tick-count > 1 { i / (t.tick-count - 1) } else { 0 }
        let y-val = calc.round(
          max-val * fraction,
          digits: if t.y-axis-value-suffix == "" { 1 } else { 0 },
        )
        let y-pos = chart-height - fraction * (chart-height - 10pt)
        place(
          left + top,
          dx: t.y-axis-label-offset,
          dy: y-pos - 5pt,
          text(size: t.axis-label-size, fill: t.text-color)[#y-val#t.y-axis-value-suffix]
        )
      }

      // Axis titles
      #if x-label != none {
        place(
          left + bottom,
          dx: axis-left,
          dy: 28pt,
          box(width: chart-width)[
            #align(center)[
              #text(size: t.axis-title-size, fill: t.text-color)[#x-label]
            ]
          ]
        )
      }

      #if y-label != none {
        place(
          left + top,
          dx: t.y-axis-title-offset,
          dy: chart-height / 2,
          rotate(-90deg)[
            #text(size: t.axis-title-size, fill: t.text-color)[#y-label]
          ]
        )
      }
    ]

    // Legend with custom spacing
    #if show-legend and t.legend-position != "none" {
      draw-chart-legend(series.map(s => s.name), t)
    }
  ]
}
