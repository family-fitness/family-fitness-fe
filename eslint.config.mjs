import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/**"] },

  nextCoreWebVitals,
  nextTypescript,

  {
    rules: {
      // 안 쓰는 변수는 CI 를 막는다. _ 로 시작하면 의도적으로 버린 것으로 본다
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // any 는 백엔드와의 계약을 무너뜨린다. 필요하면 주석으로 이유를 남길 것
      "@typescript-eslint/no-explicit-any": "error",
      // <img> 대신 next/image (LCP)
      "@next/next/no-img-element": "error",
    },
  },

  // 포맷 관련 규칙은 Prettier 에 넘긴다. 항상 마지막
  prettier,
]);
