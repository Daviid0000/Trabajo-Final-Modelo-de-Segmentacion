const controls = window;
const mpSelfieSegmentation = window;
const examples = {
    images: [],
    videos: [],
};

// Se obtienen los elementos creados en el HTML
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasElement2 = document.getElementsByClassName('output_canvas2')[0];
const overlayElement = document.getElementsByClassName('overlay')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d'); // Se obtiene el contexto 2d del canva
const canvasCtx2 = canvasElement2.getContext('2d'); // Se obtiene el contexto 2d del canva

// Se crea un panel de control para visualizar los fotogramas por segundo
const fpsControl = new controls.FPS();

// Se obtiene el la animación de carga y se establece en 'display: none' para ocultarlo cuando se termina de cargara el modelo
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

let activeEffect = 'mask';
let prevImageData = null;

function detectMotion(currentImageData) {
    if (!prevImageData) {
        prevImageData = currentImageData;
        return false;
    }

    let motionDetected = false;
    const threshold = 110; // Umbral para detectar movimiento
    const diff = new Uint32Array(currentImageData.data.length / 4);

    for (let i = 0; i < currentImageData.data.length; i += 4) {
        const rDiff = Math.abs(currentImageData.data[i] - prevImageData.data[i]);
        const gDiff = Math.abs(currentImageData.data[i + 1] - prevImageData.data[i + 1]);
        const bDiff = Math.abs(currentImageData.data[i + 2] - prevImageData.data[i + 2]);
        const avgDiff = (rDiff + gDiff + bDiff) / 3;

        if (avgDiff > threshold) {
            diff[i / 4] = 1;
            motionDetected = true;
        } else {
            diff[i / 4] = 0;
        }
    }

    prevImageData = currentImageData;
    return motionDetected;
}

function onResults(results) {
    document.body.classList.add('loaded'); // Cuando se carga el modelo se le agrega la clase 'loaded' al body y desaparece la animación de loading
    
    fpsControl.tick(); // Actualiza los fotogramas por segundo
    
    canvasCtx.save(); // Guarda el estado actual del contexto del canva
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); // Limpia el canva
    canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height); // Añade el filtro del modelo
    
    // Si 'activeEffect' = 'mask' o 'both' se dibujarán el video con el filtro en el canva
    if (activeEffect === 'mask' || activeEffect === 'both') {
        canvasCtx.globalCompositeOperation = 'source-in';
        canvasCtx.fillStyle = '#00FF007F'; // Define el color de relleno como verde con transparencia.
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height); // Rellena el lienzo con el color especificado.
    } else {
        canvasCtx.globalCompositeOperation = 'source-out';
        canvasCtx.fillStyle = '#0000FF7F'; // Define el color de relleno como azul con transparencia.
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height); // Rellena el lienzo con el color especificado.
    }

    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    canvasCtx2.clearRect(0, 0, canvasElement2.width, canvasElement2.height); // Limpia el segundo canva
    canvasCtx2.drawImage(results.image, 0, 0, canvasElement2.width, canvasElement2.height); // Dibuja la imagen original en el segundo canva

    const currentImageData = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
    if (detectMotion(currentImageData)) {
        overlayElement.style.display = 'block';
    } else {
        overlayElement.style.display = 'none';
    }
}

// Crea una instancia de SelfieSegmentation con una función para localizar los archivos necesarios.
const selfieSegmentation = new SelfieSegmentation({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
    }
});
selfieSegmentation.onResults(onResults); // Establece 'onResults' como el controlador de eventos para los resultados de segmentación.

// Se crea un panel de control el cual puede ser configurado al gusto del usuario.
new controls
    .ControlPanel(controlsElement, {
        selfieMode: true,
        modelSelection: 1,
        effect: 'mask',
    })
    // Añade varios controles al panel.
    .add([
        new controls.StaticText({ title: 'Panel de control' }), // Agrega un texto estático como título en el panel de control.
        fpsControl, // Se añade el control de los fps
        new controls.Toggle({ title: 'Modo Selfie', field: 'selfieMode' }), // Añade un interruptor para el modo selfie

        // Se añade un selector de fuente para cambiar la fuente de entrada
        new controls.SourcePicker({
            onSourceChanged: () => { // Se restablece 'selfieSegmentation' cuando se cambia la fuente.
                selfieSegmentation.reset();
            },

            // Procesa cada cuadro de entrada, ajustando el tamaño del lienzo y enviando la imagen a selfieSegmentation.
            onFrame: async (input, size) => {
                const aspect = size.height / size.width;
                let width, height;
                if (window.innerWidth > window.innerHeight) {
                    height = window.innerHeight;
                    width = height / aspect;
                } else {
                    width = window.innerWidth;
                    height = width * aspect;
                }
                canvasElement.width = width;
                canvasElement.height = height;
                await selfieSegmentation.send({ image: input });
            },
            examples: examples
        }),

        // Añade un control deslizante para seleccionar el modelo.
        new controls.Slider({
            title: 'Selección del modelo',
            field: 'modelSelection',
            discrete: ['General', 'Landscape'],
        }),

        // Añade un control deslizante para seleccionar el efecto.
        new controls.Slider({
            title: 'Efecto',
            field: 'effect',
            discrete: { 'background': 'Background', 'mask': 'Foreground' },
        }),
    ])
    // Establece un controlador para cuando cambian las opciones del panel.
    .on(x => {
        const options = x;
        videoElement.classList.toggle('selfie', options.selfieMode);
        activeEffect = x['effect'];
        selfieSegmentation.setOptions(options);
    });
