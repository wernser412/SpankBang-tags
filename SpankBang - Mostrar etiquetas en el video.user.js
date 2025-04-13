// ==UserScript==
// @name         SpankBang - Mostrar etiquetas en el video
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  Muestra etiquetas limpias y dentro del cuadro de video. Sin sonido. Compatible con la página principal y de video. Actualización desde el menú Tampermonkey con animación de carga.
// @author       Tú
// @match        *://la.spankbang.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    function mostrarMensajeCarga(texto, conSpinner = false) {
        let mensaje = document.getElementById('mensaje-carga-playlist');
        if (!mensaje) {
            mensaje = document.createElement('div');
            mensaje.id = 'mensaje-carga-playlist';
            mensaje.style.position = 'fixed';
            mensaje.style.top = '10px';
            mensaje.style.right = '10px';
            mensaje.style.backgroundColor = '#222';
            mensaje.style.color = '#fff';
            mensaje.style.padding = '10px 15px';
            mensaje.style.borderRadius = '8px';
            mensaje.style.zIndex = '10000';
            mensaje.style.fontSize = '14px';
            mensaje.style.display = 'flex';
            mensaje.style.alignItems = 'center';
            mensaje.style.gap = '8px';
            mensaje.style.boxShadow = '0 0 8px rgba(0,0,0,0.4)';
            if (conSpinner) {
                const spinner = document.createElement('div');
                spinner.style.width = '14px';
                spinner.style.height = '14px';
                spinner.style.border = '2px solid white';
                spinner.style.borderTop = '2px solid transparent';
                spinner.style.borderRadius = '50%';
                spinner.style.animation = 'spin 1s linear infinite';
                mensaje.appendChild(spinner);
            }
            const textoSpan = document.createElement('span');
            textoSpan.textContent = texto;
            textoSpan.className = 'sb-spinner-text';
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
                    cargarListasYMostrar();
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

    function cargarListasYMostrar() {
        const listas = GM_getValue("listasGuardadas", {});
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

        for (const [nombre, url] of Object.entries(listas)) {
            fetch(url).then(r => r.text()).then(html => {
                const doc = new DOMParser().parseFromString(html, "text/html");
                doc.querySelectorAll('[data-id]').forEach(el => {
                    const id = el.getAttribute('data-id');
                    if (!videosEnListas[id]) videosEnListas[id] = [];
                    videosEnListas[id].push(nombre);
                });
                listasCargadas++;
                if (listasCargadas === total) {
                    agregarEtiquetas(videosEnListas);
                }
            });
        }
    }

function agregarEtiquetas(data) {
    for (const [videoID, listas] of Object.entries(data)) {
        const video = document.querySelector(
            `.video-item[data-id="${videoID}"], [data-testid="video-item"][data-id="${videoID}"]`
        );
        if (!video) continue;

        // Buscar contenedor real de imagen
        const img = video.querySelector('.thumb img, .video-thumb img, img');
        const contenedor = img?.parentElement || video;

        // Asegurar que tenga position: relative
        contenedor.style.position = 'relative';

        // Eliminar etiqueta previa si existe
        const existente = contenedor.querySelector('.playlist-label');
        if (existente) existente.remove();

        // Crear etiqueta
        const etiqueta = document.createElement('div');
        etiqueta.className = 'playlist-label';
        etiqueta.textContent = listas.join(", ");
        Object.assign(etiqueta.style, {
            position: 'absolute',
            bottom: '6px',
            left: '6px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            zIndex: '1000',
            boxShadow: '0 0 4px rgba(0,0,0,0.3)',
            maxWidth: '90%',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            pointerEvents: 'none'
        });

        contenedor.appendChild(etiqueta);
    }

    ocultarMensajeCarga();
}




    function iniciar() {
        if (!window.location.pathname.includes("/users/playlists")) {
            setTimeout(cargarListasYMostrar, 3000);
        }
    }

    GM_registerMenuCommand("🔄 Actualizar listas", actualizarListasSinSalir);
    iniciar();
})();
