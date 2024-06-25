const controls = window;
const mpSelfieSegmentation = window;
const examples = {
    images: [],
    videos: [],
};

// Se obtienen los elementos creados en el HTML
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d'); // Se obtiene el contexto 2d del canva


// Se crea un panel de control para visualizar los fotogramas por segundo
const fpsControl = new controls.FPS();

// Se obtiene el la animación de carga y se establece en 'display: none' para ocultarlo cuando se termina de cargara el modelo
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};
let activeEffect = 'mask';
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
        canvasCtx.fillStyle = '#0000FF7F'; // Define el color de relleno como azul con transparencia.
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height); // Rellena el lienzo con el color especificado.
    }

    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    
}
const selfieSegmentation = new SelfieSegmentation({ locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
    } });
selfieSegmentation.onResults(onResults);
// Present a control panel through which the user can manipulate the solution
// options.
// Se crea un panel de control el cual puede ser configurado al gusto del usuario
new controls
    .ControlPanel(controlsElement, {
    selfieMode: true,
    modelSelection: 1,
    effect: 'mask',
})
    .add([
    new controls.StaticText({ title: 'MediaPipe Selfie Segmentation' }),
    fpsControl,
    new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new controls.SourcePicker({
        onSourceChanged: () => {
            selfieSegmentation.reset();
        },
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
    new controls.Slider({
        title: 'Model Selection',
        field: 'modelSelection',
        discrete: ['General', 'Landscape'],
    }),
    new controls.Slider({
        title: 'Effect',
        field: 'effect',
        discrete: { 'background': 'Background', 'mask': 'Foreground' },
    }),
])
    .on(x => {
    const options = x;
    videoElement.classList.toggle('selfie', options.selfieMode);
    activeEffect = x['effect'];
    selfieSegmentation.setOptions(options);
});

