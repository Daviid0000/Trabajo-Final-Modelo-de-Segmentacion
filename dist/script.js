// 1 Se definen unas constantes de forma que puedan ser utilizadas en todo el navegador para la manipulación del panel de control
const controls = window;
const mpSelfieSegmentation = window;
const examples = {
    images: [],
    videos: [],
};

// 3 Se obtienen los elementos creados en el HTML     
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasElement2 = document.getElementsByClassName('output_canvas2')[0];
const overlayElement = document.getElementsByClassName('overlay')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d'); // Se obtiene el contexto 2d del canva
const canvasCtx2 = canvasElement2.getContext('2d'); // Se obtiene el contexto 2d del canva

// 2 Se crea un panel de control para visualizar los fotogramas por segundo
const fpsControl = new controls.FPS();

// 3 Se obtiene la animación de carga y se establece en 'display: none' para ocultarlo cuando se termina de cargara el modelo
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

// Evento que inicia la detección el movimiento
const startButton = document.getElementById('startDetection');
startButton.addEventListener('click', () => {
    startDetection();
});

// Evento que detiene la detección el movimiento
const stopButton = document.getElementById('stopDetection');
stopButton.addEventListener('click', () => {
    stopDetection();
});

let activeEffect = 'mask';  // Modelo cargado por defecto
let prevImageData = null;   // Contenido del canva por defecto

let isDetecting = false;    // Movimiento por defecto

// Función para iniciar la detección de movimiento
function startDetection() {
    if (!isDetecting) {
        isDetecting = true;
        selfieSegmentation.start(); // Inicia selfieSegmentation
    }
}

// Función para detener la detección de movimiento
function stopDetection() {
    if (isDetecting) {
        isDetecting = false;
        prevImageData = null; // Reinicia prevImageData
        overlayElement.style.display = 'none'; // Oculta el overlay de detección
        selfieSegmentation.reset(); // Reinicia selfieSegmentation
    }
}

// La función 'detectMotion' recibe los datos que se encuentran en el canvas
function detectMotion(currentImageData) {
    if (!prevImageData) {
        prevImageData = currentImageData;
        return false;
    }

    
    let motionDetected = false; // Movimiento detectado por defecto

    const threshold = 160; // "Nivel de deteccción" || Umbral para detectar movimiento
    const diff = new Uint32Array(currentImageData.data.length / 4); // Se crea un array de binarios que indicaran si hay movimiento o no

    // Se calcula mediante la diferencia de colores si hay movimiento o no
    for (let i = 0; i < currentImageData.data.length; i += 4) {
        const rDiff = Math.abs(currentImageData.data[i] - prevImageData.data[i]);
        const gDiff = Math.abs(currentImageData.data[i + 1] - prevImageData.data[i + 1]);
        const bDiff = Math.abs(currentImageData.data[i + 2] - prevImageData.data[i + 2]);
        const avgDiff = (rDiff + gDiff + bDiff) / 3;

    // Si existe una diferencia entre la imagen original entonces se detecta movimiento
        if (avgDiff > threshold) {
            diff[i / 4] = 1;
            motionDetected = true;
        } else {
            diff[i / 4] = 0;
        }
    }

    prevImageData = currentImageData;
    return motionDetected; // Si se detecto movimiento se retornará movimiento
}

function onResults(results) {
    
    document.body.classList.add('loaded'); // Cuando se carga el modelo se le agrega la clase 'loaded' al body y desaparece la animación de loading
    
    fpsControl.tick(); // Actualiza los fotogramas por segundo
    
    canvasCtx.save(); // Guarda el estado actual del contexto del canva
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); // Limpia el canva
    canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height); // Añade el filtro del modelo
    
    // Si 'activeEffect' = 'mas' o 'both' se dibujarán el video con el filtro en el canva
    if (activeEffect === 'mask' || activeEffect === 'both') {
        canvasCtx.globalCompositeOperation = 'source-in';
        canvasCtx.fillStyle = '#00FF007F'; // Define el color de relleno como verde con transparencia.
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height); // Rellena el lienzo con el color especificado.
    }

    // En caso de que 'activeEffect' sea tenga un valor como 'background' se dibujará el video sin el filtro en el canva
    else {
        canvasCtx.globalCompositeOperation = 'source-out';
        canvasCtx.fillStyle = '#fff'; // Define el color de fondo como blanco con transparencia.
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height); // Rellena el lienzo con el color especificado.
    }

    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    canvasCtx2.clearRect(0, 0, canvasElement2.width, canvasElement2.height); // Limpia el segundo canva
    canvasCtx2.drawImage(results.image, 0, 0, canvasElement2.width, canvasElement2.height); // Dibuja la imagen original en el segundo canva

    const currentImageData = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
    if (isDetecting && detectMotion(currentImageData)) {
        overlayElement.style.display = 'block';
    } else {
        overlayElement.style.display = 'none';
    }
}

// 3 Se importa el modelo con una función para localizar los archivos necesarios.
const selfieSegmentation = new SelfieSegmentation({ locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
    } 
});

selfieSegmentation.onResults(onResults); // 4 Establece 'selfieSegmentation' en 'onResults' para ejecutar el modelo.

// 5 Se crea un panel de control con diferentes configuraciones
new controls
    .ControlPanel(controlsElement, {
    selfieMode: true,
    modelSelection: 1,
    effect: 'mask',
})
// 5 Añade varios controles al panel.
    .add([
    new controls.StaticText({ title: 'Panel de control' }), // Agrega un texto estático como título en el panel de control.
    fpsControl,     // Se añade el control de los fps
    new controls.Toggle({ title: 'Modo Selfie', field: 'selfieMode' }), // Añade un interruptor para el modo selfie
    
    // 6 Se añade un selector de fuente para cambiar la fuente de entrada
    new controls.SourcePicker({
        onSourceChanged: () => { // Se restablece 'selfieSegmentation' cuando se cambia la fuente.
            selfieSegmentation.reset();
        },

        // Se detecta cada cambio en la imagen, ajustando el tamaño del lienzo y enviando la imagen a selfieSegmentation.
        onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
            }
            else {
                width = window.innerWidth;
                height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await selfieSegmentation.send({ image: input });
        },
        examples: examples
    }),

    // 7 Añade un control deslizante para seleccionar el modelo.
    new controls.Slider({
        title: 'Selección del modelo',
        field: 'modelSelection',
        discrete: ['General', 'Landscape'],
    }),

    // 8 Añade un control deslizante para seleccionar el efecto.
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

// Botón para desactivar y activar detección de movimiento
const toggleButton = document.getElementById('toggleButton');

toggleButton.addEventListener('click', function() {
  toggleButton.classList.toggle('active');
});
