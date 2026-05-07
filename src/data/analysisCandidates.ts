import type { Complex, DataProfile } from '../types'

type CandidateInput = {
  id: string
  complexId: string
  kaptCode?: string
  name: string
  aliases: string[]
  district: string
  dong: string
  legalDongCode: string
  lat: number
  lng: number
  builtYear: number
  units: number
  currentFar: number
  allowedFar?: number
  landShare: number
  representativeSupplyPyeong: number
  recentPrice: number
  newBuildPrice: number
  stage?: Complex['stage']
  regulationRisk?: Complex['regulationRisk']
  residentMomentum?: Complex['residentMomentum']
  note: string
}

export const analysisCandidates: Complex[] = [
  candidate({ id: 'apt-045', complexId: 'seoul-gangnam-gaepo-woosung7', name: '개포우성7차아파트', aliases: ['개포우성7차', '우성7차'], district: '강남구', dong: '개포동', legalDongCode: '1168010300', lat: 37.489, lng: 127.071, builtYear: 1987, units: 802, currentFar: 178, landShare: 10.9, representativeSupplyPyeong: 31, recentPrice: 23.5, newBuildPrice: 8100, note: '개포권 신축 기준가가 높지만 기존 용적률과 조합원 평형 구조 확인이 필요합니다.' }),
  candidate({ id: 'apt-046', complexId: 'seoul-gangnam-gaepo-kyungnam', name: '개포경남아파트', aliases: ['개포경남', '경남아파트'], district: '강남구', dong: '개포동', legalDongCode: '1168010300', lat: 37.487, lng: 127.071, builtYear: 1984, units: 678, currentFar: 174, landShare: 11.2, representativeSupplyPyeong: 32, recentPrice: 25.5, newBuildPrice: 8100, note: '강남권 입지는 강하지만 단지 규모와 공사비 민감도를 함께 봐야 합니다.' }),
  candidate({ id: 'apt-047', complexId: 'seoul-gangnam-gaepo-hyundai1', name: '개포현대1차아파트', aliases: ['개포현대1차', '현대1차'], district: '강남구', dong: '개포동', legalDongCode: '1168010300', lat: 37.484, lng: 127.066, builtYear: 1984, units: 416, currentFar: 171, landShare: 11.7, representativeSupplyPyeong: 32, recentPrice: 24, newBuildPrice: 8100, note: '소규모 재건축 구조상 사업비와 조합원 분양 선택 변수가 큽니다.' }),
  candidate({ id: 'apt-048', complexId: 'seoul-gangnam-dogok-samik', name: '도곡삼익아파트', aliases: ['도곡삼익', '삼익아파트'], district: '강남구', dong: '도곡동', legalDongCode: '1168011800', lat: 37.49, lng: 127.04, builtYear: 1983, units: 247, currentFar: 186, landShare: 10.5, representativeSupplyPyeong: 31, recentPrice: 22, newBuildPrice: 8000, stage: '추진위', note: '강남 중소형 단지로 고급화 비용과 일반분양 여력 균형을 확인해야 합니다.' }),
  candidate({ id: 'apt-049', complexId: 'seoul-gangnam-cheongdam-samik', name: '청담삼익아파트', aliases: ['청담삼익', '삼익'], district: '강남구', dong: '청담동', legalDongCode: '1168010400', lat: 37.522, lng: 127.049, builtYear: 1980, units: 888, currentFar: 178, landShare: 12.8, representativeSupplyPyeong: 35, recentPrice: 38, newBuildPrice: 9000, stage: '사업시행인가', residentMomentum: '높음', note: '청담권 고가 신축 레퍼런스가 강하지만 고급화·공사비 부담이 큽니다.' }),
  candidate({ id: 'apt-050', complexId: 'seoul-gangnam-apgujeong-hanyang7', name: '압구정한양7차아파트', aliases: ['압구정한양7차', '한양7차'], district: '강남구', dong: '압구정동', legalDongCode: '1168011000', lat: 37.528, lng: 127.036, builtYear: 1981, units: 239, currentFar: 184, landShare: 12.2, representativeSupplyPyeong: 35, recentPrice: 39, newBuildPrice: 8660, stage: '조합설립', residentMomentum: '높음', note: '압구정 권역 신축 가치가 크지만 소규모·권역별 통합 변수를 봐야 합니다.' }),
  candidate({ id: 'apt-051', complexId: 'seoul-gangnam-apgujeong-miseong2', name: '압구정미성2차아파트', aliases: ['압구정미성2차', '미성2차'], district: '강남구', dong: '압구정동', legalDongCode: '1168011000', lat: 37.525, lng: 127.024, builtYear: 1987, units: 911, currentFar: 192, landShare: 10.6, representativeSupplyPyeong: 33, recentPrice: 34, newBuildPrice: 8660, stage: '조합설립', residentMomentum: '높음', note: '압구정 시장가치는 높지만 기존 용적률과 평형 배정 민감도가 있습니다.' }),
  candidate({ id: 'apt-052', complexId: 'seoul-songpa-sincheon-jangmi1', name: '잠실장미1차아파트', aliases: ['잠실장미1차', '장미1차'], district: '송파구', dong: '신천동', legalDongCode: '1171010200', lat: 37.518, lng: 127.103, builtYear: 1979, units: 2100, currentFar: 184, landShare: 11.1, representativeSupplyPyeong: 32, recentPrice: 28, newBuildPrice: 6100, stage: '추진위', residentMomentum: '중간', note: '잠실권 입지는 강하지만 기존 용적률과 대단지 사업비를 함께 봐야 합니다.' }),
  candidate({ id: 'apt-053', complexId: 'seoul-songpa-jamsil-woosung1', name: '잠실우성1차아파트', aliases: ['잠실우성1차', '우성1차'], district: '송파구', dong: '잠실동', legalDongCode: '1171010100', lat: 37.51, lng: 127.087, builtYear: 1981, units: 1842, currentFar: 212, landShare: 8.8, representativeSupplyPyeong: 31, recentPrice: 21, newBuildPrice: 6060, stage: '검토', note: '송파권 시장성은 좋지만 높은 기존 용적률이 일반분양 여력을 제한합니다.' }),
  candidate({ id: 'apt-054', complexId: 'seoul-songpa-sincheon-miseong-croba', name: '미성크로바아파트', aliases: ['잠실미성크로바', '미성크로바'], district: '송파구', dong: '신천동', legalDongCode: '1171010200', lat: 37.516, lng: 127.101, builtYear: 1980, units: 1350, currentFar: 190, landShare: 10.2, representativeSupplyPyeong: 32, recentPrice: 24, newBuildPrice: 6100, stage: '사업시행인가', residentMomentum: '높음', note: '잠실권 정비축 안에 있어 추진력과 시장성이 모두 중요한 후보입니다.' }),
  candidate({ id: 'apt-055', complexId: 'seoul-songpa-munjeong-siyeong', name: '문정시영아파트', aliases: ['문정시영', '시영아파트'], district: '송파구', dong: '문정동', legalDongCode: '1171010800', lat: 37.488, lng: 127.127, builtYear: 1989, units: 1316, currentFar: 214, landShare: 8.2, representativeSupplyPyeong: 25, recentPrice: 11.2, newBuildPrice: 4400, note: '기존 용적률이 높아 분담금 민감도가 큰 송파권 테스트 단지입니다.' }),
  candidate({ id: 'apt-056', complexId: 'seoul-gangdong-godeok-jugong9', name: '고덕주공9단지', aliases: ['고덕9단지', '고덕주공9'], district: '강동구', dong: '고덕동', legalDongCode: '1174010200', lat: 37.56, lng: 127.154, builtYear: 1985, units: 1320, currentFar: 174, landShare: 10.8, representativeSupplyPyeong: 31, recentPrice: 13.5, newBuildPrice: 4300, stage: '검토', note: '고덕권 신축 사례가 있으나 사업 단계와 공사비 민감도 확인이 필요합니다.' }),
  candidate({ id: 'apt-057', complexId: 'seoul-gangdong-myeongil-samik-green2', name: '삼익그린2차아파트', aliases: ['명일삼익그린2차', '삼익그린2차'], district: '강동구', dong: '명일동', legalDongCode: '1174010100', lat: 37.548, lng: 127.146, builtYear: 1983, units: 2400, currentFar: 177, landShare: 10.1, representativeSupplyPyeong: 30, recentPrice: 12.4, newBuildPrice: 4100, stage: '추진위', note: '강동권 대단지로 일반분양 여력과 사업비 규모를 같이 봐야 합니다.' }),
  candidate({ id: 'apt-058', complexId: 'seoul-gangdong-amsa-seonsa-hyundai', name: '선사현대아파트', aliases: ['암사선사현대', '선사현대'], district: '강동구', dong: '암사동', legalDongCode: '1174010700', lat: 37.552, lng: 127.128, builtYear: 2000, units: 2938, currentFar: 248, landShare: 7.1, representativeSupplyPyeong: 32, recentPrice: 11.8, newBuildPrice: 4000, note: '상대적으로 신축에 가까워 재건축 가능성보다 장기 리모델링 변수를 봐야 합니다.' }),
  candidate({ id: 'apt-059', complexId: 'seoul-yeongdeungpo-yeouido-gongjak', name: '여의도 공작아파트', aliases: ['공작아파트', '여의도공작'], district: '영등포구', dong: '여의도동', legalDongCode: '1156011000', lat: 37.52, lng: 126.926, builtYear: 1976, units: 373, currentFar: 180, allowedFar: 400, landShare: 12.6, representativeSupplyPyeong: 32, recentPrice: 25, newBuildPrice: 5400, stage: '사업시행인가', residentMomentum: '높음', note: '여의도 정비사업 흐름에 포함되나 소규모 사업비 배분을 확인해야 합니다.' }),
  candidate({ id: 'apt-060', complexId: 'seoul-yeongdeungpo-yeouido-gwangjang', name: '여의도 광장아파트', aliases: ['광장아파트', '여의도광장'], district: '영등포구', dong: '여의도동', legalDongCode: '1156011000', lat: 37.523, lng: 126.932, builtYear: 1978, units: 744, currentFar: 185, allowedFar: 400, landShare: 12.1, representativeSupplyPyeong: 32, recentPrice: 26, newBuildPrice: 5400, stage: '조합설립', residentMomentum: '높음', note: '허용 용적률 여력은 크지만 단지별 통합·분리 추진 변수를 봐야 합니다.' }),
  candidate({ id: 'apt-061', complexId: 'seoul-yongsan-ichon-wanggung', name: '이촌왕궁아파트', aliases: ['왕궁아파트', '이촌 왕궁'], district: '용산구', dong: '이촌동', legalDongCode: '1117012900', lat: 37.519, lng: 126.972, builtYear: 1974, units: 250, currentFar: 150, landShare: 15.1, representativeSupplyPyeong: 32, recentPrice: 28, newBuildPrice: 7200, stage: '검토', note: '한강변 희소성은 높지만 소규모 단지 사업 구조가 핵심 변수입니다.' }),
  candidate({ id: 'apt-062', complexId: 'seoul-yongsan-ichon-hangaram', name: '이촌한가람아파트', aliases: ['한가람아파트', '이촌 한가람'], district: '용산구', dong: '이촌동', legalDongCode: '1117012900', lat: 37.521, lng: 126.969, builtYear: 1998, units: 2036, currentFar: 255, landShare: 7.4, representativeSupplyPyeong: 32, recentPrice: 22, newBuildPrice: 6900, note: '입지는 강하지만 높은 기존 용적률과 노후도 부족이 단기 재건축에는 불리합니다.' }),
  candidate({ id: 'apt-063', complexId: 'seoul-yongsan-seobinggo-sindonga', name: '서빙고신동아아파트', aliases: ['서빙고 신동아', '신동아아파트'], district: '용산구', dong: '서빙고동', legalDongCode: '1117013300', lat: 37.518, lng: 126.995, builtYear: 1984, units: 1326, currentFar: 183, landShare: 11.8, representativeSupplyPyeong: 32, recentPrice: 30, newBuildPrice: 7200, stage: '추진위', note: '한강변·용산권 프리미엄이 크지만 규제와 공공기여 변수를 봐야 합니다.' }),
  candidate({ id: 'apt-064', complexId: 'seoul-seongdong-seongsu-jangmi', name: '성수장미아파트', aliases: ['성수 장미', '장미아파트'], district: '성동구', dong: '성수동1가', legalDongCode: '1120011400', lat: 37.545, lng: 127.043, builtYear: 1983, units: 356, currentFar: 176, landShare: 11.3, representativeSupplyPyeong: 31, recentPrice: 21, newBuildPrice: 6500, stage: '검토', note: '성수권 시장성은 높지만 소규모 재건축과 고급화 비용 확인이 필요합니다.' }),
  candidate({ id: 'apt-065', complexId: 'seoul-seongdong-oksu-geukdong', name: '옥수극동아파트', aliases: ['옥수 극동', '극동아파트'], district: '성동구', dong: '옥수동', legalDongCode: '1120011200', lat: 37.543, lng: 127.014, builtYear: 1986, units: 900, currentFar: 210, landShare: 8.9, representativeSupplyPyeong: 31, recentPrice: 18, newBuildPrice: 5600, stage: '검토', note: '한강 접근성과 역세권 장점이 있으나 기존 용적률이 부담입니다.' }),
  candidate({ id: 'apt-066', complexId: 'seoul-seongdong-haengdang-hanjin', name: '행당한진타운아파트', aliases: ['행당한진', '한진타운'], district: '성동구', dong: '행당동', legalDongCode: '1120010700', lat: 37.557, lng: 127.029, builtYear: 2000, units: 2123, currentFar: 262, landShare: 6.8, representativeSupplyPyeong: 32, recentPrice: 12.8, newBuildPrice: 4400, note: '재건축보다는 장기 노후도와 리모델링 대안 비교가 더 중요한 후보입니다.' }),
  candidate({ id: 'apt-067', complexId: 'seoul-mapo-daeheung-taeyoung', name: '대흥태영아파트', aliases: ['마포 대흥태영', '대흥태영'], district: '마포구', dong: '대흥동', legalDongCode: '1144010800', lat: 37.548, lng: 126.944, builtYear: 1999, units: 1992, currentFar: 249, landShare: 7, representativeSupplyPyeong: 32, recentPrice: 12, newBuildPrice: 3900, note: '역세권은 우수하지만 높은 용적률로 재건축 사업성은 보수적으로 봐야 합니다.' }),
  candidate({ id: 'apt-068', complexId: 'seoul-mapo-sinsu-sogang-samsung', name: '서강삼성아파트', aliases: ['서강삼성', '신수 삼성'], district: '마포구', dong: '신수동', legalDongCode: '1144011100', lat: 37.548, lng: 126.936, builtYear: 1999, units: 1042, currentFar: 244, landShare: 7.2, representativeSupplyPyeong: 32, recentPrice: 11.5, newBuildPrice: 3900, note: '마포권 수요는 안정적이나 노후도와 용적률 여력이 제한적입니다.' }),
  candidate({ id: 'apt-069', complexId: 'seoul-seodaemun-hyeonjeo-dongnipmun-geukdong', name: '독립문극동아파트', aliases: ['독립문 극동', '극동아파트'], district: '서대문구', dong: '현저동', legalDongCode: '1141011100', lat: 37.573, lng: 126.956, builtYear: 1998, units: 1300, currentFar: 238, landShare: 7.4, representativeSupplyPyeong: 32, recentPrice: 10.8, newBuildPrice: 3600, note: '도심 접근성은 좋지만 사업성은 일반분양 여력보다 시장 가격 회복에 민감합니다.' }),
  candidate({ id: 'apt-070', complexId: 'seoul-yangcheon-mokdong-2', name: '목동2단지', aliases: ['목동신시가지2단지', '목동2'], district: '양천구', dong: '목동', legalDongCode: '1147010200', lat: 37.536, lng: 126.874, builtYear: 1986, units: 1640, currentFar: 127, landShare: 14.8, representativeSupplyPyeong: 35, recentPrice: 24.5, newBuildPrice: 4550, stage: '추진위', note: '목동권 저용적률 대단지로 추진 속도와 평형 배정 변수가 중요합니다.' }),
  candidate({ id: 'apt-071', complexId: 'seoul-yangcheon-mokdong-3', name: '목동3단지', aliases: ['목동신시가지3단지', '목동3'], district: '양천구', dong: '목동', legalDongCode: '1147010200', lat: 37.534, lng: 126.878, builtYear: 1986, units: 1588, currentFar: 126, landShare: 14.9, representativeSupplyPyeong: 35, recentPrice: 24.8, newBuildPrice: 4550, stage: '추진위', note: '목동 중심권 입지와 낮은 용적률이 장점입니다.' }),
  candidate({ id: 'apt-072', complexId: 'seoul-yangcheon-mokdong-4', name: '목동4단지', aliases: ['목동신시가지4단지', '목동4'], district: '양천구', dong: '목동', legalDongCode: '1147010200', lat: 37.532, lng: 126.881, builtYear: 1986, units: 1382, currentFar: 127, landShare: 14.7, representativeSupplyPyeong: 35, recentPrice: 24.2, newBuildPrice: 4550, stage: '추진위', note: '저용적률 장점은 뚜렷하나 단지별 사업 일정 차이를 봐야 합니다.' }),
  candidate({ id: 'apt-073', complexId: 'seoul-yangcheon-mokdong-6', name: '목동6단지', aliases: ['목동신시가지6단지', '목동6'], district: '양천구', dong: '목동', legalDongCode: '1147010200', lat: 37.53, lng: 126.876, builtYear: 1986, units: 1362, currentFar: 126, landShare: 14.8, representativeSupplyPyeong: 35, recentPrice: 25, newBuildPrice: 4550, stage: '조합설립', residentMomentum: '높음', note: '목동권 내 추진력이 상대적으로 강한 테스트 단지입니다.' }),
  candidate({ id: 'apt-074', complexId: 'seoul-yangcheon-mokdong-8', name: '목동8단지', aliases: ['목동신시가지8단지', '목동8'], district: '양천구', dong: '목동', legalDongCode: '1147010200', lat: 37.527, lng: 126.872, builtYear: 1987, units: 1352, currentFar: 128, landShare: 14.5, representativeSupplyPyeong: 35, recentPrice: 23.5, newBuildPrice: 4550, stage: '추진위', note: '목동권 평균적 사업성 후보로 단계 진행 속도 확인이 필요합니다.' }),
  candidate({ id: 'apt-075', complexId: 'seoul-yangcheon-mokdong-10', name: '목동10단지', aliases: ['목동신시가지10단지', '목동10'], district: '양천구', dong: '신정동', legalDongCode: '1147010100', lat: 37.518, lng: 126.861, builtYear: 1987, units: 2160, currentFar: 132, landShare: 14.1, representativeSupplyPyeong: 35, recentPrice: 21.5, newBuildPrice: 4300, stage: '검토', note: '목동 남측 권역으로 가격대와 사업성 차이를 비교하기 좋은 후보입니다.' }),
  candidate({ id: 'apt-076', complexId: 'seoul-yangcheon-mokdong-12', name: '목동12단지', aliases: ['목동신시가지12단지', '목동12'], district: '양천구', dong: '신정동', legalDongCode: '1147010100', lat: 37.514, lng: 126.859, builtYear: 1988, units: 1860, currentFar: 134, landShare: 13.8, representativeSupplyPyeong: 35, recentPrice: 20.5, newBuildPrice: 4300, stage: '검토', note: '목동 내 상대적으로 보수적 가격대를 반영한 비교 후보입니다.' }),
  candidate({ id: 'apt-077', complexId: 'seoul-yangcheon-mokdong-13', name: '목동13단지', aliases: ['목동신시가지13단지', '목동13'], district: '양천구', dong: '신정동', legalDongCode: '1147010100', lat: 37.512, lng: 126.864, builtYear: 1987, units: 2280, currentFar: 136, landShare: 13.6, representativeSupplyPyeong: 35, recentPrice: 20.8, newBuildPrice: 4300, stage: '검토', note: '대단지 장점과 목동권 남측 가격대를 함께 반영해야 합니다.' }),
  candidate({ id: 'apt-078', complexId: 'seoul-nowon-sanggye-jugong1', name: '상계주공1단지', aliases: ['상계1단지', '상계주공1'], district: '노원구', dong: '상계동', legalDongCode: '1135010500', lat: 37.655, lng: 127.059, builtYear: 1988, units: 2100, currentFar: 190, landShare: 8.7, representativeSupplyPyeong: 24, recentPrice: 5.2, newBuildPrice: 2550, stage: '검토', note: '노원권 대단지로 일반분양가 상단과 분담금 민감도가 핵심입니다.' }),
  candidate({ id: 'apt-079', complexId: 'seoul-nowon-sanggye-jugong3', name: '상계주공3단지', aliases: ['상계3단지', '상계주공3'], district: '노원구', dong: '상계동', legalDongCode: '1135010500', lat: 37.652, lng: 127.056, builtYear: 1987, units: 2213, currentFar: 188, landShare: 8.9, representativeSupplyPyeong: 24, recentPrice: 5.4, newBuildPrice: 2550, stage: '검토', note: '대단지 규모는 장점이지만 공사비 상승 시 분담금 부담이 커질 수 있습니다.' }),
  candidate({ id: 'apt-080', complexId: 'seoul-nowon-sanggye-jugong6', name: '상계주공6단지', aliases: ['상계6단지', '상계주공6'], district: '노원구', dong: '상계동', legalDongCode: '1135010500', lat: 37.653, lng: 127.064, builtYear: 1988, units: 2646, currentFar: 190, landShare: 8.8, representativeSupplyPyeong: 24, recentPrice: 5.3, newBuildPrice: 2550, stage: '검토', note: '노원권 평균 사업성을 비교하기 위한 대단지 후보입니다.' }),
  candidate({ id: 'apt-081', complexId: 'seoul-nowon-sanggye-jugong7', name: '상계주공7단지', aliases: ['상계7단지', '상계주공7'], district: '노원구', dong: '상계동', legalDongCode: '1135010500', lat: 37.654, lng: 127.066, builtYear: 1988, units: 2634, currentFar: 191, landShare: 8.7, representativeSupplyPyeong: 24, recentPrice: 5.4, newBuildPrice: 2550, stage: '검토', note: '세대수 규모와 분담금 민감도를 함께 봐야 하는 노원권 후보입니다.' }),
  candidate({ id: 'apt-082', complexId: 'seoul-nowon-sanggye-jugong9', name: '상계주공9단지', aliases: ['상계9단지', '상계주공9'], district: '노원구', dong: '상계동', legalDongCode: '1135010500', lat: 37.657, lng: 127.067, builtYear: 1988, units: 2830, currentFar: 192, landShare: 8.6, representativeSupplyPyeong: 24, recentPrice: 5.2, newBuildPrice: 2550, stage: '검토', note: '노원권 대단지 중 공사비와 일반분양가 변동에 민감한 후보입니다.' }),
  candidate({ id: 'apt-083', complexId: 'seoul-nowon-junggye-jugong5', name: '중계주공5단지', aliases: ['중계5단지', '중계주공5'], district: '노원구', dong: '중계동', legalDongCode: '1135010600', lat: 37.648, lng: 127.077, builtYear: 1992, units: 2328, currentFar: 214, landShare: 7.8, representativeSupplyPyeong: 24, recentPrice: 5.8, newBuildPrice: 2600, note: '학군 수요는 있으나 기존 용적률이 높아 보수적 진단이 필요합니다.' }),
  candidate({ id: 'apt-084', complexId: 'seoul-nowon-hagye-jangmi', name: '하계장미아파트', aliases: ['하계 장미', '장미아파트'], district: '노원구', dong: '하계동', legalDongCode: '1135010400', lat: 37.637, lng: 127.073, builtYear: 1989, units: 1880, currentFar: 205, landShare: 8.1, representativeSupplyPyeong: 24, recentPrice: 5.6, newBuildPrice: 2550, note: '노원권 역세권 후보로 용적률 여력과 분담금 부담을 함께 확인해야 합니다.' }),
  candidate({ id: 'apt-085', complexId: 'gyeonggi-bundang-sunae-yangji-geumho', name: '양지마을금호아파트', aliases: ['분당 양지마을', '양지금호'], district: '성남분당구', dong: '수내동', legalDongCode: '4113510200', lat: 37.374, lng: 127.116, builtYear: 1992, units: 918, currentFar: 206, landShare: 8.6, representativeSupplyPyeong: 31, recentPrice: 13, newBuildPrice: 3600, note: '분당 중심권 수요는 좋지만 통합 재건축과 분담금 변수가 큽니다.' }),
  candidate({ id: 'apt-086', complexId: 'gyeonggi-bundang-jeongdeun-donga', name: '정든마을동아아파트', aliases: ['정든마을동아', '분당 정든마을'], district: '성남분당구', dong: '정자동', legalDongCode: '4113510300', lat: 37.368, lng: 127.108, builtYear: 1994, units: 720, currentFar: 215, landShare: 8.1, representativeSupplyPyeong: 31, recentPrice: 12, newBuildPrice: 3500, note: '분당 내 평균권 후보로 기존 용적률 민감도를 테스트합니다.' }),
  candidate({ id: 'apt-087', complexId: 'gyeonggi-bundang-hansol-jugong5', name: '한솔마을주공5단지', aliases: ['한솔주공5', '한솔마을5단지'], district: '성남분당구', dong: '정자동', legalDongCode: '4113510300', lat: 37.36, lng: 127.112, builtYear: 1994, units: 1156, currentFar: 218, landShare: 7.9, representativeSupplyPyeong: 24, recentPrice: 8.2, newBuildPrice: 3300, note: '중소형 비중과 분담금 민감도가 큰 분당권 후보입니다.' }),
  candidate({ id: 'apt-088', complexId: 'gyeonggi-bundang-mujigae-cheonggu', name: '무지개마을청구아파트', aliases: ['분당 무지개마을', '무지개청구'], district: '성남분당구', dong: '구미동', legalDongCode: '4113511400', lat: 37.34, lng: 127.116, builtYear: 1995, units: 932, currentFar: 220, landShare: 7.8, representativeSupplyPyeong: 31, recentPrice: 8.8, newBuildPrice: 3300, note: '분당 남측 권역의 상대적 약세와 용적률 부담을 반영한 후보입니다.' }),
  candidate({ id: 'apt-089', complexId: 'gyeonggi-pyeongchon-chowon-booyoung', name: '초원부영아파트', aliases: ['평촌 초원부영', '초원부영'], district: '안양동안구', dong: '평촌동', legalDongCode: '4117310300', lat: 37.389, lng: 126.966, builtYear: 1992, units: 1743, currentFar: 218, landShare: 8.1, representativeSupplyPyeong: 31, recentPrice: 8.2, newBuildPrice: 3000, note: '평촌권 대단지로 통합 재건축과 분담금 민감도를 같이 봐야 합니다.' }),
  candidate({ id: 'apt-090', complexId: 'gyeonggi-pyeongchon-hyangchon-hyundai', name: '향촌현대아파트', aliases: ['평촌 향촌현대', '향촌현대'], district: '안양동안구', dong: '평촌동', legalDongCode: '4117310300', lat: 37.392, lng: 126.96, builtYear: 1992, units: 780, currentFar: 216, landShare: 8.2, representativeSupplyPyeong: 31, recentPrice: 8.5, newBuildPrice: 3000, note: '평촌 내 중형 단지로 가격대 대비 사업비 부담을 확인해야 합니다.' }),
  candidate({ id: 'apt-091', complexId: 'gyeonggi-pyeongchon-hangaram-hanyang', name: '한가람한양아파트', aliases: ['평촌 한가람한양', '한가람한양'], district: '안양동안구', dong: '관양동', legalDongCode: '4117310200', lat: 37.396, lng: 126.957, builtYear: 1995, units: 952, currentFar: 225, landShare: 7.6, representativeSupplyPyeong: 31, recentPrice: 7.8, newBuildPrice: 2900, note: '높은 기존 용적률로 보수적 사업성 진단이 필요한 평촌권 후보입니다.' }),
  candidate({ id: 'apt-092', complexId: 'gyeonggi-sanbon-gaenari-jugong13', name: '개나리주공13단지', aliases: ['산본 개나리', '개나리13단지'], district: '군포시', dong: '산본동', legalDongCode: '4141010500', lat: 37.365, lng: 126.93, builtYear: 1992, units: 1778, currentFar: 218, landShare: 7.8, representativeSupplyPyeong: 24, recentPrice: 5.3, newBuildPrice: 2400, note: '산본권 대단지로 공사비와 일반분양가 상단에 민감합니다.' }),
  candidate({ id: 'apt-093', complexId: 'gyeonggi-sanbon-maehwa-jugong14', name: '매화주공14단지', aliases: ['산본 매화', '매화14단지'], district: '군포시', dong: '산본동', legalDongCode: '4141010500', lat: 37.359, lng: 126.929, builtYear: 1993, units: 1847, currentFar: 220, landShare: 7.7, representativeSupplyPyeong: 24, recentPrice: 5.2, newBuildPrice: 2400, note: '중저가권 분담금 민감도를 검증하기 좋은 산본권 후보입니다.' }),
  candidate({ id: 'apt-094', complexId: 'gyeonggi-jungdong-mirinae-village', name: '미리내마을아파트', aliases: ['중동 미리내마을', '미리내마을'], district: '부천원미구', dong: '중동', legalDongCode: '4119010900', lat: 37.505, lng: 126.767, builtYear: 1993, units: 1232, currentFar: 225, landShare: 7.5, representativeSupplyPyeong: 24, recentPrice: 6, newBuildPrice: 2500, note: '중동권 평균 용적률 부담을 반영한 비교 후보입니다.' }),
  candidate({ id: 'apt-095', complexId: 'gyeonggi-jungdong-boram-village', name: '보람마을아파트', aliases: ['중동 보람마을', '보람마을'], district: '부천원미구', dong: '중동', legalDongCode: '4119010900', lat: 37.499, lng: 126.77, builtYear: 1995, units: 1400, currentFar: 228, landShare: 7.4, representativeSupplyPyeong: 24, recentPrice: 5.9, newBuildPrice: 2500, note: '기존 용적률이 높아 사업성 개선책이 필요한 중동권 후보입니다.' }),
  candidate({ id: 'apt-096', complexId: 'gyeonggi-ilsan-munchon-village', name: '문촌마을아파트', aliases: ['일산 문촌마을', '문촌마을'], district: '고양일산서구', dong: '주엽동', legalDongCode: '4128710200', lat: 37.67, lng: 126.76, builtYear: 1994, units: 1560, currentFar: 214, landShare: 8.1, representativeSupplyPyeong: 31, recentPrice: 6.4, newBuildPrice: 2550, note: '일산 서구권 대단지로 GTX 기대와 자체 사업성을 분리해 봐야 합니다.' }),
  candidate({ id: 'apt-097', complexId: 'gyeonggi-ilsan-gangseon-village', name: '강선마을아파트', aliases: ['일산 강선마을', '강선마을'], district: '고양일산서구', dong: '주엽동', legalDongCode: '4128710200', lat: 37.669, lng: 126.762, builtYear: 1994, units: 1680, currentFar: 215, landShare: 8, representativeSupplyPyeong: 31, recentPrice: 6.3, newBuildPrice: 2550, note: '일산권 평균 후보로 높은 기존 용적률과 분담금 부담을 확인합니다.' }),
  candidate({ id: 'apt-098', complexId: 'gyeonggi-ilsan-baeksong-village', name: '백송마을아파트', aliases: ['일산 백송마을', '백송마을'], district: '고양일산동구', dong: '백석동', legalDongCode: '4128510600', lat: 37.643, lng: 126.788, builtYear: 1993, units: 1134, currentFar: 212, landShare: 8.2, representativeSupplyPyeong: 31, recentPrice: 6.5, newBuildPrice: 2600, note: '일산 동구권 후보로 교통 기대와 사업성 수치를 분리해 봐야 합니다.' }),
  candidate({ id: 'apt-099', complexId: 'gyeonggi-gwangmyeong-cheolsan-jugong12', name: '철산주공12단지', aliases: ['철산12단지', '철산주공12'], district: '광명시', dong: '철산동', legalDongCode: '4121010200', lat: 37.476, lng: 126.869, builtYear: 1986, units: 1800, currentFar: 190, landShare: 8.9, representativeSupplyPyeong: 24, recentPrice: 7.4, newBuildPrice: 3300, stage: '추진위', note: '광명권 정비사업 수요가 있으나 공사비와 일반분양가 민감도가 큽니다.' }),
  candidate({ id: 'apt-100', complexId: 'gyeonggi-gwangmyeong-haan-jugong5', name: '하안주공5단지', aliases: ['하안5단지', '하안주공5'], district: '광명시', dong: '하안동', legalDongCode: '4121010300', lat: 37.461, lng: 126.879, builtYear: 1989, units: 2032, currentFar: 198, landShare: 8.5, representativeSupplyPyeong: 24, recentPrice: 6.7, newBuildPrice: 3100, stage: '검토', note: '광명 하안권 대단지로 통합 추진과 분담금 부담을 함께 봐야 합니다.' }),
]

function candidate(input: CandidateInput): Complex {
  const allowedFar = input.allowedFar ?? 300
  const address = `${input.legalDongCode.startsWith('11') ? '서울' : '경기'} ${input.district} ${input.dong}`

  return {
    id: input.id,
    identifiers: {
      complexId: input.complexId,
      kaptCode: input.kaptCode ?? `KAPT-DEMO-${input.id.replace('apt-', '')}`,
      legalDongCode: input.legalDongCode,
      roadAddress: address,
      jibunAddress: address,
      lat: input.lat,
      lng: input.lng,
    },
    name: input.name,
    aliases: input.aliases,
    district: input.district,
    address,
    legalDongCode: input.legalDongCode,
    builtYear: input.builtYear,
    units: input.units,
    currentFar: input.currentFar,
    allowedFar,
    landShare: input.landShare,
    representativeSupplyPyeong: input.representativeSupplyPyeong,
    previousAssetValue: Math.round(input.recentPrice * 0.72 * 10) / 10,
    recentPrice: input.recentPrice,
    newBuildPrice: input.newBuildPrice,
    stage: input.stage ?? '검토',
    regulationRisk: input.regulationRisk ?? '중간',
    residentMomentum: input.residentMomentum ?? '중간',
    dataReliability: 66,
    x: clamp(Math.round(((input.lng - 126.72) / 0.45) * 100), 8, 92),
    y: clamp(Math.round(((37.69 - input.lat) / 0.38) * 100), 8, 92),
    note: input.note,
    sourceFreshness: {
      physicalInfo: '2026-04',
      transaction: '2026-03',
      regulation: '2026-03',
      costIndex: '2026-03',
    },
    dataProfile: createCandidateProfile(input),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createCandidateProfile(input: CandidateInput): DataProfile {
  return {
    estimationMode: 'public_api_estimate',
    publicSignals: [
      {
        label: '단지 물리 정보',
        value: `${input.builtYear}년 준공 · ${input.units.toLocaleString()}세대 · 현재 용적률 ${input.currentFar}%`,
        sourceType: 'inferred',
        sourceName: '분석 후보 레퍼런스 모델',
        confidence: 58,
        method: '공개적으로 알려진 단지 개요와 권역별 테스트 기준값을 결합한 초기 분석 후보값',
      },
      {
        label: '토지·규제 추정',
        value: `허용 용적률 ${input.allowedFar ?? 300}% · 평균 대지지분 ${input.landShare.toFixed(1)}평`,
        sourceType: 'inferred',
        sourceName: '권역별 정비사업 가정',
        confidence: 52,
        method: '허용 용적률 300% 기본값. 여의도 등 고밀 가능 후보만 별도 허용 용적률 적용',
      },
      {
        label: '시장 가격',
        value: `최근 시세 ${input.recentPrice.toFixed(1)}억 · 실거래 ${Math.round((input.recentPrice * 10000) / input.representativeSupplyPyeong).toLocaleString()}만원/평 · 예상 분양 ${input.newBuildPrice.toLocaleString()}만원/평`,
        sourceType: 'inferred',
        sourceName: '가격대별 신축 레퍼런스',
        confidence: 56,
        method: '평당 실거래가는 후보 최근 시세를 대표 공급평형으로 나눈 초기값. 예상 분양가는 가격대별 신축 레퍼런스 100% 시나리오. live ETL 실행 시 실거래가 기반 값으로 보정 필요',
      },
      {
        label: '추진 단계',
        value: `${input.stage ?? '검토'} · 주민 추진력 ${input.residentMomentum ?? '중간'}`,
        sourceType: 'inferred',
        sourceName: '정비사업 단계 테스트값',
        confidence: 50,
        method: '공개 정비사업 API가 직접 매칭되기 전까지 사용하는 보수적 단계 추정값',
      },
    ],
    manualSignals: [],
    gaps: [
      'K-apt 단지코드 실매칭',
      '국토부 실거래가 대표 평형 재산정',
      '필지 PNU 기반 토지·규제 매칭',
      '권리가액/종전자산 감정평가 세부표',
      '조합원 평형 신청 분포와 1+1 신청률',
      '시공사 본계약 공사비와 설계변경 조건',
    ],
  }
}
