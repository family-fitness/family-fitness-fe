import { NextResponse } from "next/server";

import type { Facility } from "@/lib/api/types";

/**
 * 근처 공공체육시설 프록시.
 *
 * 공공데이터포털 API 는 CORS 헤더를 주지 않아서 브라우저가 직접 부를 수 없다.
 * 그리고 서비스키를 브라우저에 내려보내면 누구나 가져다 쓴다.
 * 두 문제 모두 이 Route Handler 하나로 해결한다 — 키는 서버에만 남는다.
 *
 * 실제 API 연동은 어느 데이터셋을 쓸지 정해진 뒤에 채운다(user-flow.md 6-5 미확정).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLatitude = searchParams.get("latitude");
  const rawLongitude = searchParams.get("longitude");

  // Number(null) 은 0 이고 Number.isFinite(0) 은 true 다.
  // 파라미터가 아예 없는 경우를 먼저 걸러내지 않으면 좌표 없이도 통과한다.
  const latitude = rawLatitude === null ? NaN : Number(rawLatitude);
  const longitude = rawLongitude === null ? NaN : Number(rawLongitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { code: "INVALID_COORDINATES", message: "위치 정보가 필요해요." },
      { status: 400 },
    );
  }

  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY;
  if (!serviceKey) {
    // 아직 활용신청 전이다. 데이터셋이 정해지면 여기서 실제 API 를 부른다
    return NextResponse.json<Facility[]>([]);
  }

  return NextResponse.json<Facility[]>([]);
}
