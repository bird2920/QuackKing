import React from "react";

const QuackKingLogo = ({ className = "" }) => (
  <span className={`inline-flex items-baseline ${className}`.trim()} aria-label="QuackKing">
    <span className="text-white" aria-hidden>
      Quack
    </span>
    <span className="text-yellow-300" aria-hidden>
      King
    </span>
    <span className="sr-only">QuackKing</span>
  </span>
);

export default QuackKingLogo;
