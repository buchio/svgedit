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
        document.addEventListener('modeChange', (e) => {
            setTimeout(updatePanelVisibility, 10)
        })

        // Capture drawn elements into Master Group
        // SVG-Edit typically dispatches 'drawn' or 'selected' events via svgCanvas.bind
        // However, we can hook into the global or svgCanvas events if available.
        // A robust way in v7 extension is to use the callback in addExtension if it supports event hooks,
        // or just bind to existing ones.
        // Let's assume typical 'bind' availability or use a dirty check.
        // Actually, svgCanvas.bind('drawn', handler) is standard.

        svgCanvas.bind('drawn', (e) => {
            if (svgCanvas.getMode() !== 'tessellation') return

            const element = e.elem || e
            if (!element) return

            // Move into master group
            const svgContent = svgCanvas.getSvgContent()
            const masterGroup = svgContent.querySelector('#tessellation-master-group')

            if (masterGroup && element.parentNode !== masterGroup) {
                // We need to preserve visual size.
                // Master group has transform="scale(50)".
                // We must scale the element by 1/50 = 0.02 to keep it looking the same.

                // Get current transform or create one
                // SVGElements have transform list.
                // valid approach: element.setAttribute('transform', 'scale(0.02)')
                // But we should append to existing transform?
                // For simplicity, just set/prepend.

                const currentTransform = element.getAttribute('transform') || ''
                // Prepend scaling
                element.setAttribute('transform', 'scale(0.02) ' + currentTransform)

                // Also stroke-width needs to be scaled DOWN? 
                // If we scale the element geometry by 0.02, the stroke width scales too?
                // Wait. transform="scale(0.02)" on the group/element affects everything.
                // If stroke-width was "1", it becomes "0.02" visually.
                // BUT the MasterGroup is scaled x50.
                // So 0.02 * 50 = 1.
                // So visually stroke width remains correct!

                masterGroup.appendChild(element)
                console.log('Moved element to master group with scale compensation')
            }
        })

        setTimeout(setupOverlay, 500)

        // Helper to generate tiles
        const generateTiles = () => {
            const svgContent = svgCanvas.getSvgContent()
            const currentDrawing = svgCanvas.getCurrentDrawing()
            const currentLayer = currentDrawing.getCurrentLayer()

            let defs = svgCanvas.findDefs()

            // 1. Setup Prototile (Clipping Path)
            let prototile = defs.querySelector('#tessellation-prototile')
            if (!prototile) {
                prototile = document.createElementNS(svgCanvas.NS.SVG, 'path')
                prototile.id = 'tessellation-prototile'
                defs.appendChild(prototile)
            }
            const d = tilingManager.getPrototilePath()
            prototile.setAttribute('d', d)

            let clipPath = defs.querySelector('#tessellation-clip')
            if (!clipPath) {
                clipPath = document.createElementNS(svgCanvas.NS.SVG, 'clipPath')
                clipPath.id = 'tessellation-clip'
                const useProto = document.createElementNS(svgCanvas.NS.SVG, 'use')
                useProto.setAttributeNS(svgCanvas.NS.XLINK, 'xlink:href', '#tessellation-prototile')
                useProto.setAttribute('href', '#tessellation-prototile')
                clipPath.appendChild(useProto)
                defs.appendChild(clipPath)
            }

            // 2. Setup Master Group (User edits this)
            // We want this to be the "active" drawing target if possible, or we move drawn elements here.
            let masterGroup = svgContent.querySelector('#tessellation-master-group')
            if (!masterGroup) {
                masterGroup = document.createElementNS(svgCanvas.NS.SVG, 'g')
                masterGroup.id = 'tessellation-master-group'
                masterGroup.setAttribute('clip-path', 'url(#tessellation-clip)')

                // Add a visual boundary for the user
                const boundary = document.createElementNS(svgCanvas.NS.SVG, 'use')
                boundary.setAttributeNS(svgCanvas.NS.XLINK, 'xlink:href', '#tessellation-prototile')
                boundary.setAttribute('href', '#tessellation-prototile')
                boundary.setAttribute('fill', 'none')
                boundary.setAttribute('stroke', '#ff0000') // Red outline for editing area
                boundary.setAttribute('stroke-width', '1')
                boundary.setAttribute('stroke-dasharray', '5,5')
                boundary.id = 'tessellation-boundary'
                masterGroup.appendChild(boundary)

                // Master group should be on top so user can interact
                currentLayer.appendChild(masterGroup)
            }
            // Ensure boundary matches current shape
            const boundary = masterGroup.querySelector('#tessellation-boundary')
            if (boundary) {
                // boundary logic already handled by referencing static prototile id, but prototile path updated above
            }

            // 3. Setup Background Group (Reflections)
            let bgGroup = svgContent.querySelector('#tessellation-bg-group')
            if (!bgGroup) {
                bgGroup = document.createElementNS(svgCanvas.NS.SVG, 'g')
                bgGroup.id = 'tessellation-bg-group'
                bgGroup.style.pointerEvents = 'none' // Non-interactive background
                // Insert before master group so it's behind
                currentLayer.insertBefore(bgGroup, masterGroup)
            } else {
                while (bgGroup.firstChild) {
                    bgGroup.removeChild(bgGroup.firstChild)
                }
            }
            bgGroup.setAttribute('transform', 'scale(' + TILE_SCALE + ')')

            // Scale Master Group too?
            // Yes, user draws in scaled units? Or unscaled?
            // If TILE_SCALE is 50, coordinates are small.
            // Let's keep Master Group SCALED so user draws in "screen" pixels roughly?
            // Wait, if Master Group is scaled, <use> refs will be double scaled if we put them in a scaled group?
            // B) Master Group is trasnformed by scale(50). User draws inside.

            masterGroup.setAttribute('transform', 'scale(' + TILE_SCALE + ')')
            // Complex decision: 
            // A) Master Group is at scale 1. Tiles are scaled by 50. This means Master Group elements will be HUGE relative to tile.
            // B) Master Group is trasnformed by scale(50). User draws inside.

            masterGroup.setAttribute('transform', 'scale(' + TILE_SCALE + ')')

            const visibleW = svgCanvas.getContentW() / TILE_SCALE
            const visibleH = svgCanvas.getContentH() / TILE_SCALE

            // Generate tiles for the visible area
            const tiles = tilingManager.getTilesInRegion(-1, -1, visibleW + 1, visibleH + 1)

            let count = 0
            const MAX_TILES = 500

            try {
                for (const tile of tiles) {
                    if (count >= MAX_TILES) break;
                    count++;

                    // Skip the identity tile (0,0 aspect 0 etc) if we want to show the Master Group there?
                    // Actually, if we show Master Group, we shouldn't draw a tile ON TOP of it.
                    // But <use> is cheap. 
                    // Let's draw ALL tiles in bgGroup. 
                    // MasterGroup is on top.

                    const use = document.createElementNS(svgCanvas.NS.SVG, 'use')
                    use.setAttribute('href', '#tessellation-master-group')
                    use.setAttributeNS(svgCanvas.NS.XLINK, 'xlink:href', '#tessellation-master-group')

                    const T = tile.T
                    if (isNaN(T[0]) || isNaN(T[1])) continue;

                    const transform = 'matrix(' + T[0] + ',' + T[3] + ',' + T[1] + ',' + T[4] + ',' + T[2] + ',' + T[5] + ')'
                    use.setAttribute('transform', transform)

                    // Colorizing <use> of a Group is tricky if the group has own colors.
                    // But we can set opacity or filter?
                    // For now simple reflection.

                    // Checkerboard tinting via separate rect?
                    // Or just let user draw.

                    bgGroup.appendChild(use)
                }
            } catch (e) {
                console.error('Error generating tiles:', e);
            }

            // Move any new drawing elements into master group???
            // This requires hooking 'selected' or 'drawn' event.
            // For now, this function just sets up the stage.
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
