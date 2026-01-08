/**
 * @file ext-tessellation.js
 * @brief Extension for Isohedral Tiling (Tessellation) in SVG-Edit V7
 * @copyright 2024
 */

import { TilingManager } from './TilingManager.js'

const name = 'tessellation'

export default {
    name,
    // Note: When loaded via userExtensions in EditorStartup.js, init is bound as: init.bind(this, config)
    // So 'this' is the Editor instance, and the first argument is the config object (or undefined/empty).
    // The standard arguments ({importLocale, ...}) are passed by svgcanvas.addExtension, 
    // but seemingly as the *second* argument if the first is bound? 
    // Actually, bind prepends arguments.
    // EditorStartup.js:703 -> this.addExtension(name, (initfn && initfn.bind(this, config)), {})
    // svgcanvas.js:885 -> extInitFunc(argObj)
    // So effectively: init(config, argObj)
    // But 'this' is Editor.

    init(config, argObj) {
        console.log('!!! TESSELLATION EXTENSION LOADING !!!')

        // Context 'this' is the Editor instance because of .bind(this) in EditorStartup.js
        const svgEditor = this
        const svgCanvas = svgEditor.svgCanvas
        const { $id, $click } = svgCanvas

        // argObj comes from svgcanvas.js and contains { importLocale, svgroot, svgContent, ... }
        // We can inspect it if needed, but we mostly need svgCanvas/svgEditor.

        const tilingManager = new TilingManager()

        let overlayCanvas = null
        let ctx = null
        let isDragging = false
        const TILE_SCALE = 50

        // Create Canvas Overlay
        const setupOverlay = () => {
            const workarea = document.getElementById('workarea')
            if (!workarea) return

            overlayCanvas = document.createElement('canvas')
            overlayCanvas.id = 'tessellation_overlay'
            overlayCanvas.style.position = 'absolute'
            overlayCanvas.style.top = '0'
            overlayCanvas.style.left = '0'
            overlayCanvas.style.pointerEvents = 'none'
            overlayCanvas.style.zIndex = '5000'

            const updateSize = () => {
                overlayCanvas.width = workarea.clientWidth
                overlayCanvas.height = workarea.clientHeight
            }
            updateSize()
            window.addEventListener('resize', updateSize)
            workarea.appendChild(overlayCanvas)
            ctx = overlayCanvas.getContext('2d')
            console.log('Tessellation Overlay Setup Complete')
        }
        // Panel UI
        let panel = null
        const createPanel = () => {
            if (panel) return
            const workarea = document.getElementById('workarea')

            panel = document.createElement('div')
            panel.id = 'tessellation_panel'
            panel.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                width: 200px;
                background: #f0f0f0;
                border: 1px solid #ccc;
                padding: 10px;
                z-index: 5001;
                font-family: sans-serif;
                font-size: 12px;
                display: none;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `

            const title = document.createElement('div')
            title.textContent = 'Tessellation Settings'
            title.style.fontWeight = 'bold'
            title.style.marginBottom = '10px'
            panel.appendChild(title)

            const typeRow = document.createElement('div')
            typeRow.style.marginBottom = '10px'
            const label = document.createElement('label')
            label.textContent = 'Type (1-93): '

            const input = document.createElement('input')
            input.type = 'number'
            input.min = '1'
            input.max = '93'
            input.value = tilingManager.tilingType
            input.style.width = '50px'

            // Container for parameter sliders
            const paramsContainer = document.createElement('div')
            paramsContainer.id = 'tess_params_container'

            const updateParamsUI = () => {
                paramsContainer.innerHTML = '' // Clear existing
                const params = tilingManager.getTilingParams()

                params.forEach((val, index) => {
                    const row = document.createElement('div')
                    row.style.marginBottom = '5px'
                    row.style.display = 'flex'
                    row.style.alignItems = 'center'

                    const pLabel = document.createElement('span')
                    pLabel.textContent = `P${index + 1}: `
                    pLabel.style.width = '30px'

                    const range = document.createElement('input')
                    range.type = 'range'
                    // Determine range based on value magnitude or default to generic 0-2?
                    // tactile.js params can be anything, but usually geometric ratios.
                    // We'll try a generous range centered on the current value.
                    // Or static 0 to 2 for simplicity for now?
                    // Let's try 0 to 2, step 0.01.
                    range.min = '0'
                    range.max = '2'
                    range.step = '0.01'
                    range.value = val

                    const valDisplay = document.createElement('span')
                    valDisplay.textContent = val.toFixed(2)
                    valDisplay.style.marginLeft = '5px'
                    valDisplay.style.fontSize = '10px'

                    range.addEventListener('input', (e) => {
                        const newVal = parseFloat(e.target.value)
                        params[index] = newVal
                        valDisplay.textContent = newVal.toFixed(2)
                        tilingManager.setTilingParams(params)

                        // Auto-redraw if group exists
                        const svgContent = svgCanvas.getSvgContent()
                        const group = svgContent.querySelector('#tessellation-group')
                        generateTiles()
                    })

                    row.appendChild(pLabel)
                    row.appendChild(range)
                    row.appendChild(valDisplay)
                    paramsContainer.appendChild(row)
                })
            }

            input.addEventListener('change', (e) => {
                let val = parseInt(e.target.value)
                if (val < 1) val = 1
                if (val > 93) val = 93
                e.target.value = val
                tilingManager.setTilingType(val)
                updateParamsUI()
                generateTiles()
            })

            // Initial population
            updateParamsUI()

            typeRow.appendChild(label)
            typeRow.appendChild(input)
            panel.appendChild(typeRow)
            panel.appendChild(paramsContainer)

            workarea.appendChild(panel)
        }

        const updatePanelVisibility = () => {
            if (!panel) createPanel()
            if (svgCanvas.getMode() === 'tessellation') {
                panel.style.display = 'block'
            } else {
                panel.style.display = 'none'
            }
        }

        // Listen for mode changes 
        // Note: SVG-Edit usually fires 'selected' or updates UI, but we can hook into mode changes via mouse events or better, a custom listener if possible.
        // Or we just check in our mouse handlers, but that doesn't hide it if we switch AWAY.
        // We'll trust the extension mechanism or add a global listener if needed.
        // EditorStartup adds 'modeChange' to document.
        document.addEventListener('modeChange', (e) => {
            // e.detail might contain the mode, or we check svgCanvas
            // Wait a tick for mode to update?
            setTimeout(updatePanelVisibility, 10)
        })

        setTimeout(setupOverlay, 500)

        // Helper to generate tiles
        const generateTiles = () => {
            const svgContent = svgCanvas.getSvgContent()
            const currentDrawing = svgCanvas.getCurrentDrawing()

            let defs = svgCanvas.findDefs()
            let prototile = defs.querySelector('#tessellation-prototile')
            if (!prototile) {
                prototile = document.createElementNS(svgCanvas.NS.SVG, 'path')
                prototile.id = 'tessellation-prototile'
                defs.appendChild(prototile)
            }

            const d = tilingManager.getPrototilePath()
            prototile.setAttribute('d', d)
            // prototile.setAttribute('fill', 'currentColor') // Removed to allow <use> elements to apply fill

            let group = svgContent.querySelector('#tessellation-group')
            if (!group) {
                group = document.createElementNS(svgCanvas.NS.SVG, 'g')
                group.id = 'tessellation-group'
                group.setAttribute('fill', 'none')
                group.setAttribute('stroke', '#000')
                group.setAttribute('stroke-width', '0.02')

                // Append to current layer
                const currentLayer = currentDrawing.getCurrentLayer()
                currentLayer.appendChild(group)
            } else {
                while (group.firstChild) {
                    group.removeChild(group.firstChild)
                }
            }
            group.setAttribute('transform', 'scale(' + TILE_SCALE + ')')

            const visibleW = svgCanvas.getContentW() / TILE_SCALE
            const visibleH = svgCanvas.getContentH() / TILE_SCALE

            // Generate tiles for the visible area
            const tiles = tilingManager.getTilesInRegion(-1, -1, visibleW + 1, visibleH + 1)

            let count = 0
            const MAX_TILES = 500

            try {
                for (const tile of tiles) {
                    if (count >= MAX_TILES) {
                        // limit reached
                        break;
                    }
                    count++;

                    const use = document.createElementNS(svgCanvas.NS.SVG, 'use')
                    use.setAttribute('href', '#tessellation-prototile')
                    use.setAttributeNS(svgCanvas.NS.XLINK, 'xlink:href', '#tessellation-prototile')

                    const T = tile.T
                    if (isNaN(T[0]) || isNaN(T[1])) {
                        continue;
                    }

                    const transform = 'matrix(' + T[0] + ',' + T[3] + ',' + T[1] + ',' + T[4] + ',' + T[2] + ',' + T[5] + ')'
                    use.setAttribute('transform', transform)

                    // Checkerboard coloring
                    if (tile.aspect % 2 === 0) {
                        use.setAttribute('fill', '#ffe0e0')
                    } else {
                        use.setAttribute('fill', '#e0e0ff')
                    }

                    group.appendChild(use)
                }
            } catch (e) {
                console.error('Error generating tiles:', e);
            }

            svgCanvas.call('changed', [group])
        }

        return {
            name: 'Mobile Tessellation',
            callback() {
                // Hexagon Icon Base64
                const iconVal = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTIgMkwyIDd2MTBsMTAgNSAxMC01Vjd6IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg=='

                const buttonTemplate = document.createElement('template')
                buttonTemplate.innerHTML =
                    '<se-button id="tool_tessellation" title="Tessellation Mode" src="' + iconVal + '"></se-button>'

                const toolsLeft = $id('tools_left')
                if (toolsLeft) {
                    toolsLeft.append(buttonTemplate.content.cloneNode(true))
                    console.log('Tessellation Button Added to DOM')

                    const btn = $id('tool_tessellation')
                    if (btn) {
                        $click(btn, () => {
                            svgCanvas.setMode('tessellation')
                            console.log('Mode set to tessellation')
                        })
                    }
                } else {
                    console.error('tools_left not found')
                }
            },

            mouseDown(opts) {
                if (svgCanvas.getMode() === 'tessellation') {
                    isDragging = true
                    return { started: true }
                }
            },

            mouseMove(opts) {
                if (svgCanvas.getMode() === 'tessellation' && isDragging) {
                    if (ctx && overlayCanvas) {
                        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
                        ctx.globalAlpha = 0.5
                        ctx.fillStyle = 'blue'
                        ctx.strokeStyle = 'red'
                        ctx.lineWidth = 2

                        const event = opts.event
                        const svgContent = svgCanvas.getSvgContent()
                        const ctm = svgContent.getScreenCTM()

                        if (ctm) {
                            const pt = svgContent.createSVGPoint()
                            pt.x = event.clientX
                            pt.y = event.clientY
                            const svgP = pt.matrixTransform(ctm.inverse())
                            const screenPt = svgP.matrixTransform(ctm)

                            ctx.beginPath()
                            ctx.arc(screenPt.x, screenPt.y, 20, 0, 2 * Math.PI)
                            ctx.fill()

                            // Debug text
                            ctx.fillStyle = 'black'
                            ctx.font = '12px sans-serif'
                            ctx.fillText('SVG: ' + svgP.x.toFixed(2) + ',' + svgP.y.toFixed(2), screenPt.x + 25, screenPt.y + 15)
                        } else {
                            const x = event.clientX
                            const y = event.clientY
                            ctx.beginPath()
                            ctx.arc(x, y, 20, 0, 2 * Math.PI)
                            ctx.fill()
                        }
                    }
                }
            },

            mouseUp(opts) {
                if (svgCanvas.getMode() === 'tessellation') {
                    isDragging = false
                    if (ctx) ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
                    console.log('Tessellation MouseUp - Committing')

                    generateTiles()
                }
            }
        }
    }
}
