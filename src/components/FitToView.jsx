import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Shrinks its content to fit the available box (never enlarges it), so a whole
 * document can be read top to bottom without scrolling.
 * The parent must give this component a definite height.
 */
export default function FitToView({ children, designWidth = 794 }) {
  const boxRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return undefined;

    const update = () => {
      const h = content.offsetHeight;
      setContentHeight(h);
      if (!h) return;
      setScale(Math.min(1, box.clientWidth / designWidth, box.clientHeight / h));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, [designWidth]);

  return (
    <div ref={boxRef} className="w-full h-full flex items-start justify-center overflow-hidden">
      <div
        className="print:!w-auto print:!h-auto"
        style={{ width: designWidth * scale, height: contentHeight * scale }}
      >
        <div
          ref={contentRef}
          className="print:!transform-none"
          style={{ width: designWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
