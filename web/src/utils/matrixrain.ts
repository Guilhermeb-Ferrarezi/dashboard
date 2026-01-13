export interface MatrixRainController {
  stop(): void;
}

export interface MatrixRainOptions {
  fontSize?: number;
  interval?: number;
  opacity?: number;
}

export function startMatrixRain(
  canvas: HTMLCanvasElement,
  options: MatrixRainOptions = {}
): MatrixRainController {
  const ctx = canvas.getContext("2d")!;

  const fontSize = options.fontSize ?? 18;
  const interval = options.interval ?? 70;
  const opacity = options.opacity ?? 0.06;

  const charset = "PROGRAMACAOWEB0123456789";
  const colors = ["#00ff9c", "#00cc7a", "#00aaff", "#ffffff", "#e4021a"];
  const headColor = "#eafff5";

  let width = 0;
  let height = 0;
  let columns = 0;
  let drops: number[] = [];
  let chars: string[] = [];
  let timer: number;

  function resize(): void {
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = "top";

    columns = Math.floor(width / fontSize);
    drops = new Array(columns);
    chars = new Array(columns);

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * (height / fontSize));
      chars[i] = charset[Math.floor(Math.random() * charset.length)];
    }
  }

  function draw(): void {
    ctx.fillStyle = `rgba(0,0,0,${opacity})`;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < columns; i++) {
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ctx.fillStyle = headColor;
      ctx.fillText(chars[i], x, y);

      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillText(chars[i], x, y - fontSize);

      drops[i]++;

      if (y > height) {
        drops[i] = 0;
        chars[i] = charset[Math.floor(Math.random() * charset.length)];
      }
    }
  }

  resize();
  window.addEventListener("resize", resize);
  timer = window.setInterval(draw, interval);

  return {
    stop() {
      clearInterval(timer);
      window.removeEventListener("resize", resize);
    },
  };
}
