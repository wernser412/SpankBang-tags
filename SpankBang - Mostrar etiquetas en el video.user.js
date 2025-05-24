// ==UserScript==
// @name         SpankBang - Listas con colores, ícono y progreso
// @namespace    http://tampermonkey.net/
// @version      3.7
// @description  Etiquetas coloridas con ícono e indicador de progreso. Carga automática, sin sonido. Botón desde el menú de Tampermonkey.
// @author       Tú
// @match        *://la.spankbang.com/*
// @icon         https://raw.githubusercontent.com/wernser412/SpankBang-tags/refs/heads/main/icono.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    const colores = [
        "#f4a261", "#2a9d8f", "#e76f51", "#6a4c93", "#f6bd60", "#3d5a80",
        "#ffb4a2", "#90be6d", "#a8dadc", "#b5838d", "#f94144", "#577590"
    ];

    function mostrarMensajeCarga(texto, conSpinner = false) {
        let mensaje = document.getElementById('mensaje-carga-playlist');
        if (!mensaje) {
            mensaje = document.createElement('div');
            mensaje.id = 'mensaje-carga-playlist';
            Object.assign(mensaje.style, {
                position: 'fixed',
                top: '10px',
                right: '10px',
                backgroundColor: '#222',
                color: '#fff',
                padding: '10px 15px',
                borderRadius: '8px',
                zIndex: '10000',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 8px rgba(0,0,0,0.4)'
            });
            if (conSpinner) {
                const spinner = document.createElement('div');
                Object.assign(spinner.style, {
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                });
                mensaje.appendChild(spinner);
            }
            const textoSpan = document.createElement('span');
            textoSpan.className = 'sb-spinner-text';
            textoSpan.textContent = texto;
            mensaje.appendChild(textoSpan);
            document.body.appendChild(mensaje);

            const estilo = document.createElement('style');
            estilo.textContent = `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `;
            document.head.appendChild(estilo);
        } else {
            mensaje.querySelector('.sb-spinner-text').textContent = texto;
        }
    }

    function ocultarMensajeCarga() {
        const mensaje = document.getElementById('mensaje-carga-playlist');
        if (mensaje) mensaje.remove();
    }

    function actualizarListasSinSalir() {
        mostrarMensajeCarga("Actualizando listas...", true);
        fetch("/users/playlists")
            .then(r => r.text())
            .then(html => {
                const doc = new DOMParser().parseFromString(html, "text/html");
                const listas = {};
                doc.querySelectorAll('.playlist-item').forEach(item => {
                    const nombre = item.querySelector('.inf')?.innerText.trim();
                    const href = item.getAttribute('href');
                    if (nombre && href) listas[nombre] = href;
                });
                if (Object.keys(listas).length > 0) {
                    GM_setValue("listasGuardadas", listas);
                    mostrarMensajeCarga("✅ Listas actualizadas.");
                    setTimeout(ocultarMensajeCarga, 1500);
                    cargarListasYMostrar(listas);
                } else {
                    mostrarMensajeCarga("⚠ No se encontraron listas.");
                    setTimeout(ocultarMensajeCarga, 2000);
                }
            }).catch(err => {
                console.error("Error al actualizar listas:", err);
                mostrarMensajeCarga("❌ Error al actualizar.");
                setTimeout(ocultarMensajeCarga, 3000);
            });
    }

    function cargarListasYMostrar(listas = null) {
        if (!listas) listas = GM_getValue("listasGuardadas", {});
        if (!Object.keys(listas).length) {
            mostrarMensajeCarga("⚠ No hay listas guardadas. Usa el menú.");
            return;
        }
        mostrarMensajeCarga("Cargando etiquetas...", true);
        procesarVideosEnListas(listas);
    }

    function procesarVideosEnListas(listas) {
        const videosEnListas = {};
        let listasCargadas = 0;
        const total = Object.keys(listas).length;

        const updateProgreso = () => {
            const porcentaje = Math.round((listasCargadas / total) * 100);
            mostrarMensajeCarga(`Actualizando listas (${listasCargadas} de ${total})... ${porcentaje}%`, true);
        };

        for (const [nombre, url] of Object.entries(listas)) {
            fetch(url).then(r => r.text()).then(html => {
                const doc = new DOMParser().parseFromString(html, "text/html");
                doc.querySelectorAll('[data-id]').forEach(el => {
                    const id = el.getAttribute('data-id');
                    if (!videosEnListas[id]) videosEnListas[id] = [];
                    videosEnListas[id].push(nombre);
                });
                listasCargadas++;
                updateProgreso();
                if (listasCargadas === total) {
                    agregarEtiquetas(videosEnListas);
                }
            }).catch(err => {
                console.error("Error cargando lista:", err);
                listasCargadas++;
                updateProgreso();
                if (listasCargadas === total) {
                    agregarEtiquetas(videosEnListas);
                }
            });
        }
    }

    function agregarEtiquetas(data) {
        const colorPorLista = {};
        let colorIndex = 0;

        for (const [videoID, listas] of Object.entries(data)) {
            const video = document.querySelector(`.video-item[data-id="${videoID}"], [data-testid="video-item"][data-id="${videoID}"]`);
            if (!video) continue;

            const contenedor = video.querySelector('.thumb, .video-thumb');
            if (!contenedor) continue;

            const existente = contenedor.querySelector('.playlist-label');
            if (existente) existente.remove();

            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.bottom = '5px';
            wrapper.style.left = '5px';
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.gap = '3px';
            wrapper.style.zIndex = '1000';

            listas.forEach(lista => {
                if (!colorPorLista[lista]) {
                    colorPorLista[lista] = colores[colorIndex % colores.length];
                    colorIndex++;
                }
                const etiqueta = document.createElement('div');
                etiqueta.className = 'playlist-label';
                etiqueta.textContent = `📁 ${lista}`;
                Object.assign(etiqueta.style, {
                    backgroundColor: colorPorLista[lista],
                    color: 'black',
                    padding: '2px 6px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                });
                wrapper.appendChild(etiqueta);
            });

            if (getComputedStyle(contenedor).position === 'static') {
                contenedor.style.position = 'relative';
            }

            contenedor.appendChild(wrapper);
        }

        ocultarMensajeCarga();
    }

    function iniciar() {
        if (!window.location.pathname.includes("/users/playlists")) {
            setTimeout(() => {
                const listas = GM_getValue("listasGuardadas", {});
                if (Object.keys(listas).length) {
                    cargarListasYMostrar(listas);
                }
            }, 3000);
        }
    }

    GM_registerMenuCommand("🔄 Actualizar listas", actualizarListasSinSalir);
    iniciar();
})();
