"use client";

import { FormEvent, MouseEvent, PointerEvent, useEffect, useRef, useState } from "react";

const HERO_TYPED_COPY = "Ищете AI-разработчика?";
type HeroIntroPhase = "typing" | "returning" | "reveal" | "done";
const FINAL_CTA_TYPED_COPY = "Опишите задачу.\nПолучите список кандидатов.";
type FinalCtaPhase = "idle" | HeroIntroPhase;
type CookieConsent = "unknown" | "accepted";

const COOKIE_CONSENT_KEY = "insol-cookie-consent-v1";

const PHONE_PATTERN = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;

function formatPhone(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  let normalized = cleaned;

  if (normalized.startsWith("8")) normalized = `+7${normalized.slice(1)}`;
  else if (normalized.startsWith("7") && !normalized.startsWith("+")) normalized = `+${normalized}`;
  else if (!normalized.startsWith("+7") && normalized.length > 0) normalized = `+7${normalized}`;

  const match = normalized.match(/^\+?7(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
  if (!match) return normalized.slice(0, 18);

  const [, area, prefix, pairOne, pairTwo] = match;
  let result = "+7";
  if (area) result += ` (${area}`;
  if (prefix) result += `) ${prefix}`;
  if (pairOne) result += `-${pairOne}`;
  if (pairTwo) result += `-${pairTwo}`;
  return result;
}

const benefitChannels = [
  "AI‑контакт‑центр",
  "поиск по корпоративным данным",
  "автоматизация процессов",
  "компьютерное зрение",
  "AI для продаж",
  "другая AI‑задача",
];

const priceItems = [
  "Опыт в похожих проектах",
  "Специализация и технологии",
  "Соответствие срокам, масштабу и бюджету",
];

const marketplaceChain = ["знакомый подрядчик", "презентация", "переговоры", "проверка", "выбор", ""];
const insolChain = ["задача", "похожий опыт", "сравнение", "вопросы", "кандидаты", "выбор"];

const passportItems = [
  {
    id: "experience",
    title: "Похожий опыт",
    summary: "какие задачи исполнитель уже решал",
    detail: <>Сравните вашу задачу с выполненными проектами: отраслью, масштабом, ограничениями и ожидаемым результатом. Чем ближе исходные условия, тем полезнее этот опыт для выбора.</>,
  },
  {
    id: "evidence",
    title: "Подтверждение результатов",
    summary: "на чём основаны заявления о проекте",
    detail: <>Уточните, какие сведения можно подтвердить документами, отзывом клиента или демонстрацией решения. Это помогает отделить фактический опыт от общей маркетинговой презентации.</>,
  },
  {
    id: "specialization",
    title: "Специализация команды",
    summary: "какие AI‑задачи команда знает лучше всего",
    detail: <>Посмотрите, какие технологии и типы решений команда использует на практике, кто будет работать над проектом и есть ли у исполнителя нужная предметная экспертиза.</>,
  },
  {
    id: "delivery",
    title: "Готовность к реализации",
    summary: "подходит ли команда под условия проекта",
    detail: <>Важно сопоставить доступность специалистов, сроки, бюджет, способ размещения решения и требования к интеграциям. Эти условия стоит проверить до начала переговоров.</>,
  },
  {
    id: "risks",
    title: "Вопросы и ограничения",
    summary: "что нужно уточнить до договора",
    detail: <>Короткий список открытых вопросов помогает заранее обсудить зависимости, доступ к данным, поддержку после запуска и другие условия, которые могут повлиять на проект.</>,
  },
];

export default function Home() {
  const [activePassport, setActivePassport] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [csrfToken, setCsrfToken] = useState("");
  const [formError, setFormError] = useState("");
  const [phone, setPhone] = useState("");
  const [typedHeroCopy, setTypedHeroCopy] = useState("");
  const [heroIntroPhase, setHeroIntroPhase] = useState<HeroIntroPhase>("typing");
  const [typedFinalCtaCopy, setTypedFinalCtaCopy] = useState("");
  const [finalCtaPhase, setFinalCtaPhase] = useState<FinalCtaPhase>("idle");
  const [passportIntroVisible, setPassportIntroVisible] = useState(false);
  const [winWinVisible, setWinWinVisible] = useState(false);
  const [revealedPassportItems, setRevealedPassportItems] = useState<number[]>([]);
  const [revealedBenefitChannels, setRevealedBenefitChannels] = useState<number[]>([]);
  const [revealedPriceItems, setRevealedPriceItems] = useState<number[]>([]);
  const [revealedDifferenceItems, setRevealedDifferenceItems] = useState<number[]>([]);
  const [cookieConsent, setCookieConsent] = useState<CookieConsent | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const typedHeroRef = useRef<HTMLSpanElement>(null);
  const finalCtaRef = useRef<HTMLElement>(null);
  const typedFinalCtaRef = useRef<HTMLSpanElement>(null);
  const originHeadingRef = useRef<HTMLDivElement>(null);
  const originPrimaryRef = useRef<HTMLParagraphElement>(null);
  const originStandardRef = useRef<HTMLParagraphElement>(null);
  const benefitHeadingRef = useRef<HTMLDivElement>(null);
  const benefitPrimaryRef = useRef<HTMLParagraphElement>(null);
  const benefitStatementRef = useRef<HTMLParagraphElement>(null);
  const benefitChannelsIntroRef = useRef<HTMLParagraphElement>(null);
  const benefitChannelRefs = useRef<Array<HTMLLIElement | null>>([]);
  const priceItemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const passportHeadingRef = useRef<HTMLDivElement>(null);
  const passportCopyRef = useRef<HTMLParagraphElement>(null);
  const passportArtRef = useRef<HTMLImageElement>(null);
  const winWinRef = useRef<HTMLDivElement>(null);
  const winWinTrophyRef = useRef<HTMLImageElement>(null);
  const matchHeadingRef = useRef<HTMLHeadingElement>(null);
  const priceHeadingRef = useRef<HTMLHeadingElement>(null);
  const priceValueRef = useRef<HTMLElement>(null);
  const earlyHeadingRef = useRef<HTMLHeadingElement>(null);
  const differenceHeadingRef = useRef<HTMLHeadingElement>(null);
  const differenceNoteRef = useRef<HTMLParagraphElement>(null);
  const differenceItemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const passportIntroRef = useRef<HTMLDivElement>(null);
  const passportItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const passportCenterAnimationRef = useRef(0);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  useEffect(() => {
    let nextConsent: CookieConsent = "unknown";
    try {
      const savedConsent = window.localStorage.getItem(COOKIE_CONSENT_KEY);
      nextConsent = savedConsent === "accepted" ? "accepted" : "unknown";
    } catch {
      nextConsent = "unknown";
    }
    const frame = window.requestAnimationFrame(() => setCookieConsent(nextConsent));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedMotionFrame = window.requestAnimationFrame(() => {
        setTypedHeroCopy(HERO_TYPED_COPY);
        setHeroIntroPhase("done");
      });
      return () => window.cancelAnimationFrame(reducedMotionFrame);
    }

    const duration = 1500;
    const startedAt = performance.now();
    let frame = 0;

    const typeNextCharacter = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const visibleCharacters = Math.floor(progress * HERO_TYPED_COPY.length);
      setTypedHeroCopy(HERO_TYPED_COPY.slice(0, visibleCharacters));

      if (progress < 1) {
        frame = window.requestAnimationFrame(typeNextCharacter);
      } else {
        setTypedHeroCopy(HERO_TYPED_COPY);
        setHeroIntroPhase("returning");
      }
    };

    frame = window.requestAnimationFrame(typeNextCharacter);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const finalCta = finalCtaRef.current;
    if (!finalCta) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setFinalCtaPhase((phase) => phase === "idle" ? "typing" : phase);
      },
      { threshold: 0.35 },
    );

    observer.observe(finalCta);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (finalCtaPhase !== "typing") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => {
        setTypedFinalCtaCopy(FINAL_CTA_TYPED_COPY);
        setFinalCtaPhase("done");
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const duration = 1500;
    const startedAt = performance.now();
    let frame = 0;

    const typeNextCharacter = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const visibleCharacters = Math.floor(progress * FINAL_CTA_TYPED_COPY.length);
      setTypedFinalCtaCopy(FINAL_CTA_TYPED_COPY.slice(0, visibleCharacters));

      if (progress < 1) {
        frame = window.requestAnimationFrame(typeNextCharacter);
      } else {
        setTypedFinalCtaCopy(FINAL_CTA_TYPED_COPY);
        setFinalCtaPhase("returning");
      }
    };

    frame = window.requestAnimationFrame(typeNextCharacter);
    return () => window.cancelAnimationFrame(frame);
  }, [finalCtaPhase]);

  useEffect(() => () => {
    window.cancelAnimationFrame(passportCenterAnimationRef.current);
  }, []);

  useEffect(() => {
    const passportItemElements = passportItemRefs.current.filter((item): item is HTMLDivElement => item !== null);
    if (!passportItemElements.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setRevealedPassportItems(passportItems.map((_, index) => index)));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset.passportIndex);
          setRevealedPassportItems((items) => items.includes(index) ? items : [...items, index]);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 },
    );

    passportItemElements.forEach((item) => observer.observe(item));
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const benefitChannelElements = benefitChannelRefs.current.filter((item): item is HTMLLIElement => item !== null);
    if (!benefitChannelElements.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setRevealedBenefitChannels(benefitChannels.map((_, index) => index)));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset.benefitChannelIndex);
          setRevealedBenefitChannels((items) => items.includes(index) ? items : [...items, index]);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 },
    );

    benefitChannelElements.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const priceItemElements = priceItemRefs.current.filter((item): item is HTMLLIElement => item !== null);
    if (!priceItemElements.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setRevealedPriceItems(priceItems.map((_, index) => index)));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset.priceIndex);
          setRevealedPriceItems((items) => items.includes(index) ? items : [...items, index]);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 },
    );

    priceItemElements.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const differenceItemElements = differenceItemRefs.current.filter((item): item is HTMLLIElement => item !== null);
    if (!differenceItemElements.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setRevealedDifferenceItems(Array.from({ length: marketplaceChain.length - 1 + insolChain.length }, (_, index) => index)));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset.differenceIndex);
          setRevealedDifferenceItems((items) => items.includes(index) ? items : [...items, index]);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 },
    );

    differenceItemElements.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const togglePassportItem = (itemId: string, itemIndex: number) => {
    const willOpen = activePassport !== itemId;
    setActivePassport(willOpen ? itemId : null);
    if (!willOpen) return;

    window.cancelAnimationFrame(passportCenterAnimationRef.current);
    passportCenterAnimationRef.current = window.requestAnimationFrame(() => {
      const item = passportItemRefs.current[itemIndex];
      if (!item) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        item.scrollIntoView({ block: "center" });
        return;
      }

      const startedAt = performance.now();
      const startScrollY = window.scrollY;
      const duration = 800;

      const centerItem = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const easedProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const bounds = item.getBoundingClientRect();
        const itemCenterInDocument = window.scrollY + bounds.top + bounds.height / 2;
        const targetScrollY = Math.max(0, itemCenterInDocument - window.innerHeight / 2);

        window.scrollTo(0, startScrollY + (targetScrollY - startScrollY) * easedProgress);

        if (progress < 1) {
          passportCenterAnimationRef.current = window.requestAnimationFrame(centerItem);
        }
      };

      passportCenterAnimationRef.current = window.requestAnimationFrame(centerItem);
    });
  };

  useEffect(() => {
    const passportIntro = passportIntroRef.current;
    if (!passportIntro) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setPassportIntroVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setPassportIntroVisible(entry.isIntersecting),
      { threshold: 0.5 },
    );

    observer.observe(passportIntro);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const winWin = winWinRef.current;
    if (!winWin) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setWinWinVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setWinWinVisible(entry.isIntersecting),
      { threshold: 0.5 },
    );

    observer.observe(winWin);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (heroIntroPhase !== "typing" || !typedHeroCopy || !typedHeroRef.current || !heroRef.current) return;

    const textNode = typedHeroRef.current.firstChild;
    if (!textNode) return;

    const range = document.createRange();
    range.setStart(textNode, Math.max(typedHeroCopy.length - 1, 0));
    range.setEnd(textNode, typedHeroCopy.length);
    const characterBounds = range.getBoundingClientRect();
    const heroBounds = heroRef.current.getBoundingClientRect();
    heroRef.current.style.setProperty("--spot-x", `${characterBounds.right - heroBounds.left}px`);
    heroRef.current.style.setProperty("--spot-y", `${characterBounds.top + characterBounds.height / 2 - heroBounds.top}px`);
  }, [typedHeroCopy, heroIntroPhase]);

  useEffect(() => {
    if (finalCtaPhase !== "typing" || !typedFinalCtaCopy || !typedFinalCtaRef.current || !finalCtaRef.current) return;

    const textNode = typedFinalCtaRef.current.firstChild;
    if (!textNode) return;

    const range = document.createRange();
    range.setStart(textNode, Math.max(typedFinalCtaCopy.length - 1, 0));
    range.setEnd(textNode, typedFinalCtaCopy.length);
    const characterBounds = range.getBoundingClientRect();
    const sectionBounds = finalCtaRef.current.getBoundingClientRect();
    finalCtaRef.current.style.setProperty("--spot-x", `${characterBounds.right - sectionBounds.left}px`);
    finalCtaRef.current.style.setProperty("--spot-y", `${characterBounds.top + characterBounds.height / 2 - sectionBounds.top}px`);
  }, [typedFinalCtaCopy, finalCtaPhase]);

  useEffect(() => {
    if (heroIntroPhase !== "returning") return;

    const frame = window.requestAnimationFrame(() => {
      heroRef.current?.style.setProperty("--spot-x", "72vw");
      heroRef.current?.style.setProperty("--spot-y", "38vh");
    });
    const revealTimer = window.setTimeout(() => setHeroIntroPhase("reveal"), 700);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(revealTimer);
    };
  }, [heroIntroPhase]);

  useEffect(() => {
    if (heroIntroPhase !== "reveal") return;
    const completionTimer = window.setTimeout(() => setHeroIntroPhase("done"), 600);
    return () => window.clearTimeout(completionTimer);
  }, [heroIntroPhase]);

  useEffect(() => {
    if (finalCtaPhase !== "returning") return;

    const frame = window.requestAnimationFrame(() => {
      finalCtaRef.current?.style.setProperty("--spot-x", "50%");
      finalCtaRef.current?.style.setProperty("--spot-y", "50%");
    });
    const revealTimer = window.setTimeout(() => setFinalCtaPhase("reveal"), 700);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(revealTimer);
    };
  }, [finalCtaPhase]);

  useEffect(() => {
    if (finalCtaPhase !== "reveal") return;
    const completionTimer = window.setTimeout(() => setFinalCtaPhase("done"), 600);
    return () => window.clearTimeout(completionTimer);
  }, [finalCtaPhase]);

  useEffect(() => {
    const heading = originHeadingRef.current;
    const primaryCopy = originPrimaryRef.current;
    const standardCopy = originStandardRef.current;
    const benefitHeading = benefitHeadingRef.current;
    const benefitPrimary = benefitPrimaryRef.current;
    const benefitStatement = benefitStatementRef.current;
    const benefitChannelsIntro = benefitChannelsIntroRef.current;
    const benefitChannelElements = benefitChannelRefs.current.filter((item): item is HTMLLIElement => item !== null);
    const passportHeading = passportHeadingRef.current;
    const passportCopy = passportCopyRef.current;
    const passportArt = passportArtRef.current;
    const winWinTrophy = winWinTrophyRef.current;
    const matchHeading = matchHeadingRef.current;
    const priceHeading = priceHeadingRef.current;
    const priceValue = priceValueRef.current;
    const earlyHeading = earlyHeadingRef.current;
    const differenceHeading = differenceHeadingRef.current;
    const differenceNote = differenceNoteRef.current;
    if (!heading || !primaryCopy || !standardCopy || !benefitHeading || !benefitPrimary || !benefitStatement || !benefitChannelsIntro || benefitChannelElements.length !== benefitChannels.length || !passportHeading || !passportCopy || !passportArt || !winWinTrophy || !matchHeading || !priceHeading || !priceValue || !earlyHeading || !differenceHeading || !differenceNote) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      heading.style.setProperty("--origin-slide", "0%");
      primaryCopy.style.setProperty("--origin-copy-slide", "0%");
      standardCopy.style.setProperty("--origin-copy-slide", "0%");
      benefitHeading.style.setProperty("--benefit-slide", "0%");
      benefitPrimary.style.setProperty("--benefit-copy-slide", "0%");
      benefitStatement.style.setProperty("--benefit-copy-slide", "0%");
      benefitChannelsIntro.style.setProperty("--benefit-channel-slide", "0%");
      passportHeading.style.setProperty("--passport-heading-slide", "0%");
      passportCopy.style.setProperty("--passport-copy-slide", "0%");
      passportArt.style.setProperty("--passport-art-slide", "0%");
      winWinTrophy.style.setProperty("--passport-art-slide", "0%");
      differenceNote.style.setProperty("--difference-note-slide", "0%");
      [matchHeading, priceHeading, priceValue, earlyHeading, differenceHeading].forEach((element) => element.style.setProperty("--passport-heading-slide", "0%"));
      return;
    }

    const motionTargets = [
      [heading, "--origin-slide"],
      [primaryCopy, "--origin-copy-slide"],
      [standardCopy, "--origin-copy-slide"],
      [benefitHeading, "--benefit-slide"],
      [benefitPrimary, "--benefit-copy-slide"],
      [benefitStatement, "--benefit-copy-slide"],
      [benefitChannelsIntro, "--benefit-channel-slide"],
      [passportHeading, "--passport-heading-slide"],
      [passportCopy, "--passport-copy-slide"],
      [passportArt, "--passport-art-slide"],
      [winWinTrophy, "--passport-art-slide"],
      [matchHeading, "--passport-heading-slide"],
      [priceHeading, "--passport-heading-slide"],
      [priceValue, "--passport-heading-slide"],
      [earlyHeading, "--passport-heading-slide"],
      [differenceHeading, "--passport-heading-slide"],
      [differenceNote, "--difference-note-slide"],
    ] as const;
    if (window.matchMedia("(max-width: 760px)").matches) {
      const targetsByAnchor = new Map<HTMLElement, Array<readonly [HTMLElement, string]>>();
      const completionTimers: number[] = [];

      motionTargets.forEach(([element, property]) => {
        element.classList.add("motion-slide");
        const anchor = element.parentElement ?? element;
        const targets = targetsByAnchor.get(anchor) ?? [];
        targets.push([element, property]);
        targetsByAnchor.set(anchor, targets);
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const anchor = entry.target as HTMLElement;
          const targets = targetsByAnchor.get(anchor);
          if (!targets) return;

          window.requestAnimationFrame(() => {
            targets.forEach(([element, property]) => {
              element.style.setProperty(property, "0%");
              completionTimers.push(window.setTimeout(() => {
                element.classList.add("motion-slide-complete");
              }, 950));
            });
          });
          observer.unobserve(anchor);
        });
      }, { threshold: 0.01, rootMargin: "0px 0px -8% 0px" });

      targetsByAnchor.forEach((_, anchor) => observer.observe(anchor));

      return () => {
        observer.disconnect();
        completionTimers.forEach((timer) => window.clearTimeout(timer));
        motionTargets.forEach(([element]) => {
          element.classList.remove("motion-slide", "motion-slide-complete");
        });
      };
    }

    let frame = 0;
    const elementVisibility = (element: HTMLElement, viewportHeight: number) => {
      const bounds = element.getBoundingClientRect();
      const travelZone = viewportHeight * 0.38;
      const enterProgress = Math.min(Math.max((viewportHeight - bounds.top) / travelZone, 0), 1);
      const exitProgress = Math.min(Math.max(bounds.bottom / travelZone, 0), 1);
      const progress = Math.min(enterProgress, exitProgress);
      return 1 - Math.pow(1 - progress, 3);
    };

    const updateMovingPhrases = () => {
      frame = 0;
      const viewportHeight = window.innerHeight;
      const offsetFor = (element: HTMLElement) => 112 * (1 - elementVisibility(element, viewportHeight));

      heading.style.setProperty("--origin-slide", `${-offsetFor(heading)}%`);
      primaryCopy.style.setProperty("--origin-copy-slide", `${offsetFor(primaryCopy)}%`);
      standardCopy.style.setProperty("--origin-copy-slide", `${offsetFor(standardCopy)}%`);
      benefitHeading.style.setProperty("--benefit-slide", `${-offsetFor(benefitHeading)}%`);
      benefitPrimary.style.setProperty("--benefit-copy-slide", `${offsetFor(benefitPrimary)}%`);
      benefitStatement.style.setProperty("--benefit-copy-slide", `${offsetFor(benefitStatement)}%`);
      benefitChannelsIntro.style.setProperty("--benefit-channel-slide", `${-offsetFor(benefitChannelsIntro)}%`);
      passportHeading.style.setProperty("--passport-heading-slide", `${-offsetFor(passportHeading)}%`);
      passportCopy.style.setProperty("--passport-copy-slide", `${offsetFor(passportCopy)}%`);
      passportArt.style.setProperty("--passport-art-slide", `${offsetFor(passportArt)}%`);
      winWinTrophy.style.setProperty("--passport-art-slide", `${offsetFor(winWinTrophy)}%`);
      matchHeading.style.setProperty("--passport-heading-slide", `${-offsetFor(matchHeading)}%`);
      priceHeading.style.setProperty("--passport-heading-slide", `${-offsetFor(priceHeading)}%`);
      priceValue.style.setProperty("--passport-heading-slide", `${-offsetFor(priceValue)}%`);
      earlyHeading.style.setProperty("--passport-heading-slide", `${-offsetFor(earlyHeading)}%`);
      differenceHeading.style.setProperty("--passport-heading-slide", `${-offsetFor(differenceHeading)}%`);
      differenceNote.style.setProperty("--difference-note-slide", `${offsetFor(differenceNote)}%`);
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateMovingPhrases);
    };

    updateMovingPhrases();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const loadFormToken = async () => {
    const response = await fetch("/send.php", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null) as { csrf_token?: string; message?: string } | null;
    if (!response.ok || !payload?.csrf_token) throw new Error(payload?.message || "Не удалось подготовить защищённую форму");
    setCsrfToken(payload.csrf_token);
    return payload.csrf_token;
  };

  const beginForm = () => {
    setStatus("idle");
    setFormError("");
    setCsrfToken("");
    setPhone("");
    setModalOpen(true);
    setMenuOpen(false);
    void loadFormToken().catch(() => {
      // На локальном сервере PHP недоступен; перед отправкой будет выполнена повторная попытка.
    });
  };

  const openForm = () => {
    beginForm();
  };

  const acceptCookies = () => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    } catch {
      // Согласие действует в рамках текущей вкладки, если хранилище браузера недоступно.
    }
    setCookieConsent("accepted");
  };

  useEffect(() => {
    if (status !== "success") return;
    const timer = window.setTimeout(() => {
      setModalOpen(false);
      setStatus("idle");
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const form = event.currentTarget;
    const phoneInput = form.elements.namedItem("phone") as HTMLInputElement | null;
    if (phoneInput?.value && !PHONE_PATTERN.test(phoneInput.value)) {
      setStatus("error");
      setFormError("Введите номер в формате +7 (000) 000-00-00");
      return;
    }

    setStatus("sending");
    try {
      const token = csrfToken || await loadFormToken();
      const formData = new FormData(form);
      formData.set("csrf_token", token);
      const response = await fetch("/send.php", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message || "Не удалось отправить заявку");
      setStatus("success");
      form.reset();
      setPhone("");
      setCsrfToken("");
    } catch (error) {
      setStatus("error");
      setFormError(error instanceof Error ? error.message : "Не удалось отправить заявку. Попробуйте ещё раз.");
    }
  }

  const moveHeroGlow = (event: PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    if (heroIntroPhase !== "done") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    event.currentTarget.style.setProperty("--spot-x", `${x}px`);
    event.currentTarget.style.setProperty("--spot-y", `${y}px`);
    event.currentTarget.classList.add("is-tracking");
  };

  const resetHeroGlow = () => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    if (heroIntroPhase !== "done") return;
    if (!heroRef.current) return;
    heroRef.current.classList.remove("is-tracking");
    heroRef.current.style.setProperty("--spot-x", "72vw");
    heroRef.current.style.setProperty("--spot-y", "38vh");
  };

  const moveFinalCtaGlow = (event: PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    if (finalCtaPhase !== "done") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
    event.currentTarget.classList.add("is-tracking");
  };

  const resetFinalCtaGlow = () => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    if (finalCtaPhase !== "done" || !finalCtaRef.current) return;
    finalCtaRef.current.classList.remove("is-tracking");
    finalCtaRef.current.style.setProperty("--spot-x", "50%");
    finalCtaRef.current.style.setProperty("--spot-y", "50%");
  };

  const navigateToSection = (event: MouseEvent<HTMLAnchorElement>, sectionId: string, heading: HTMLElement | null) => {
    event.preventDefault();
    setMenuOpen(false);

    window.requestAnimationFrame(() => {
      const target = heading ?? document.getElementById(sectionId);
      if (!target) return;
      const bounds = target.getBoundingClientRect();
      const targetScrollY = Math.max(0, window.scrollY + bounds.top + bounds.height / 2 - window.innerHeight / 2);
      window.history.pushState(null, "", `#${sectionId}`);
      window.scrollTo({
        top: targetScrollY,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  };

  return (
    <main>
      <header className={menuOpen ? "site-header menu-is-open" : "site-header"}>
        <div className="header-bar">
          <a className="logo" href="#top" aria-label="INSOL">
            IN<span>SOL</span>
          </a>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Меню INSOL" aria-expanded={menuOpen}>
            <span className="menu-glyph" aria-hidden="true">IN</span>
          </button>
        </div>
        <nav className={menuOpen ? "nav nav-open" : "nav"} aria-label="INSOL">
          <a href="#passport" onClick={(event) => navigateToSection(event, "passport", passportHeadingRef.current)}>Что вы получите</a>
          <a href="#match" onClick={(event) => navigateToSection(event, "match", matchHeadingRef.current)}>Как проходит подбор</a>
          <a href="#price" onClick={(event) => navigateToSection(event, "price", priceHeadingRef.current)}>Критерии</a>
          <button className="primary-button verification-button" onClick={openForm}>Описать проект</button>
        </nav>
      </header>

      <section className={`hero section intro-${heroIntroPhase}${typedHeroCopy ? " has-typed" : ""}`} id="top" ref={heroRef} onPointerMove={moveHeroGlow} onPointerLeave={resetHeroGlow}>
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orbit orbit-one" aria-hidden="true" />
        <div className="hero-orbit orbit-two" aria-hidden="true" />
        <div className="hero-content">
          <div className="eyebrow">INSOL помогает бизнесу подобрать<br />AI‑разработчиков и интеграторов под конкретную задачу.</div>
          <h1 aria-label="Ищете AI-разработчика? Выберите исполнителя по опыту в похожих проектах.">
            <span className="typing-line" aria-hidden="true">
              <span className="typing-reserve">{HERO_TYPED_COPY}</span>
              <span className="typing-output" ref={typedHeroRef}>{typedHeroCopy}</span>
            </span>
            <span className={heroIntroPhase === "reveal" || heroIntroPhase === "done" ? "proof-line is-visible" : "proof-line"} aria-hidden="true">Выберите исполнителя по опыту в похожих <span className="ai-accent">AI</span>‑проектах.</span>
          </h1>
          <p className="hero-lead">Расскажите, какой результат нужен вашему бизнесу. INSOL поможет найти подходящих исполнителей и сравнить их опыт, специализацию и условия работы.</p>
          <div className="hero-actions">
            <button className="primary-button verification-button" onClick={openForm}>Описать задачу</button>
          </div>
        </div>
      </section>

      <section className="origin section light-section" id="origin">
        <div className="origin-heading" ref={originHeadingRef}>
          <h2>Почему INSOL</h2>
        </div>
        <div className="origin-copy">
          <p ref={originPrimaryRef}>Знакомому интегратору проще довериться.<br />Но для новой AI‑задачи важнее опыт в похожих проектах.</p>
          <p className="origin-standard" ref={originStandardRef}><strong>INSOL помогает расширить поиск и сравнить кандидатов по понятным критериям.</strong></p>
        </div>
      </section>

      <section className="passport section" id="passport">
          <div className="section-heading passport-heading">
            <div className="passport-heading-row">
              <div className="passport-scroll-heading" ref={passportHeadingRef}>
                <h2>Что вы получите</h2>
              </div>
              <img className="passport-heading-art" ref={passportArtRef} src="/ai-passport.svg" alt="Карточка подбора INSOL" />
            </div>
          <p className="passport-scroll-copy" ref={passportCopyRef}><strong>Короткий список</strong> исполнителей с пояснениями, какой опыт каждого кандидата относится к вашей задаче</p>
        </div>
        <div className="passport-layout">
          <div className={passportIntroVisible ? "passport-intro is-visible" : "passport-intro"} ref={passportIntroRef}>
            <p>Вместо длинного каталога вы получаете основу для осознанного выбора: релевантный опыт, сильные стороны кандидатов и вопросы, которые стоит уточнить до договора.</p>
            <h3>Что учитывается при сравнении:</h3>
          </div>
          <div className="passport-list" aria-label="AI Passport">
            {passportItems.map((item, index) => (
              <div
                className={`${activePassport === item.id ? "passport-item active" : "passport-item"}${revealedPassportItems.includes(index) ? " is-visible" : ""}`}
                key={item.id}
                data-passport-index={index}
                ref={(element) => { passportItemRefs.current[index] = element; }}
              >
                <button
                  className="passport-trigger"
                  onClick={() => togglePassportItem(item.id, index)}
                  aria-expanded={activePassport === item.id}
                  aria-controls={`passport-${item.id}`}
                >
                  <strong>{item.title}</strong>
                  <span className="passport-summary">{item.summary}</span>
                  <span className="basic-icon basic-icon-toggle" aria-hidden="true" />
                </button>
                <div className="passport-panel" id={`passport-${item.id}`} aria-hidden={activePassport !== item.id}>
                  <div><p>{item.detail}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="benefit section light-section" id="benefit">
        <div className="benefit-top">
          <div className="benefit-heading" ref={benefitHeadingRef}>
            <h2>С каких задач начать</h2>
          </div>
          <div className="benefit-copy">
            <p ref={benefitPrimaryRef}>Опишите бизнес‑задачу, а не технологию.</p>
            <p className="benefit-statement" ref={benefitStatementRef}>Техническое задание не обязательно.<br />Для начала достаточно нескольких предложений о желаемом результате.</p>
          </div>
        </div>
        <div className="benefit-channels">
          <p className="benefit-channels-intro" ref={benefitChannelsIntroRef}>INSOL может помочь с подбором исполнителей для таких направлений:</p>
          <ul className="benefit-channel-list">
            {benefitChannels.map((channel, index) => (
              <li
                className={revealedBenefitChannels.includes(index) ? "is-visible" : ""}
                data-benefit-channel-index={index}
                key={channel}
                ref={(element) => { benefitChannelRefs.current[index] = element; }}
              >{channel}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="match section" id="match">
        <h2 className="passport-heading-motion" ref={matchHeadingRef}>Как проходит подбор</h2>
        <div className="match-content">
          <div className="match-steps">
            <p>1. Вы описываете задачу своими словами.</p>
            <p>2. INSOL сопоставляет её с опытом исполнителей:<br />проекты × отрасль × технологии × команда × сроки × бюджет</p>
            <p>3. Вы получаете список кандидатов и причины, по которым они подходят.</p>
          </div>
          <div className={winWinVisible ? "winwin is-visible" : "winwin"} ref={winWinRef}>
            <img className="match-trophy" ref={winWinTrophyRef} src="/insol-trophy.svg" alt="Результат подбора INSOL" />
            <strong>Понятный результат:</strong>
            <p>не сотни анкет, а несколько кандидатов<br />с подходящим опытом и условиями работы,</p>
            <p>плюс список вопросов, которые важно<br />обсудить перед выбором.</p>
          </div>
        </div>
      </section>

      <section className="price section light-section" id="price">
        <div className="price-copy">
          <h2 className="passport-heading-motion" ref={priceHeadingRef}>Критерии подбора</h2>
          <strong className="price-value passport-heading-motion" ref={priceValueRef}>По вашей задаче</strong>
        </div>
        <div className="price-card">
          <ul className="price-list">
            {priceItems.map((item, index) => (
              <li
                className={revealedPriceItems.includes(index) ? "price-item is-visible" : "price-item"}
                data-price-index={index}
                key={item}
                ref={(element) => { priceItemRefs.current[index] = element; }}
              >{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="early section" id="early">
        <div className="early-copy"><h2 className="passport-heading-motion" ref={earlyHeadingRef}>Если проект конфиденциальный</h2></div>
        <div className="early-list">
          <p>Начните без названия компании</p>
          <p>Не указывайте чувствительные детали в первой заявке</p>
          <p>Согласуйте условия конфиденциальности до передачи ТЗ</p>
          <p>Открывайте только необходимые материалы и доступы</p>
        </div>
      </section>

      <section className="difference section light-section" id="difference">
        <h2 className="passport-heading-motion" ref={differenceHeadingRef}>В чем отличия INSOL</h2>
        <div className="compare">
          <div className="difference-chain compare-muted">
            <h3>Обычный поиск подрядчика:</h3>
            <ol>
              {marketplaceChain.map((item, index) => item ? (
                <li
                  className={revealedDifferenceItems.includes(index) ? "is-visible" : ""}
                  data-difference-index={index}
                  key={item}
                  ref={(element) => { differenceItemRefs.current[index] = element; }}
                ><span>{item}</span></li>
              ) : <li className="is-empty" key="empty"><span /></li>)}
            </ol>
          </div>
          <div className="difference-chain compare-active">
            <h3>Подбор с INSOL:</h3>
            <ol>
              {insolChain.map((item, index) => {
                const revealIndex = marketplaceChain.length - 1 + index;
                return (
                  <li
                    className={revealedDifferenceItems.includes(revealIndex) ? "is-visible" : ""}
                    data-difference-index={revealIndex}
                    key={item}
                    ref={(element) => { differenceItemRefs.current[revealIndex] = element; }}
                  ><span>{item}</span></li>
                );
              })}
            </ol>
          </div>
        </div>
        <p className="difference-note" ref={differenceNoteRef}><strong>INSOL специализируется на подборе разработчиков и интеграторов для проектов в области искусственного интеллекта.</strong></p>
      </section>

      <section
        className={`final-cta section final-intro-${finalCtaPhase}${typedFinalCtaCopy ? " has-typed" : ""}`}
        id="contact"
        ref={finalCtaRef}
        onPointerMove={moveFinalCtaGlow}
        onPointerLeave={resetFinalCtaGlow}
      >
        <h2 className="final-cta-heading" aria-label="Опишите задачу. Получите список кандидатов. Начните с нескольких предложений о желаемом результате.">
          <span className="final-typing-line typing-line" aria-hidden="true">
            <span className="typing-reserve">{FINAL_CTA_TYPED_COPY}</span>
            <span className="typing-output" ref={typedFinalCtaRef}>{typedFinalCtaCopy}</span>
          </span>
          <span className={finalCtaPhase === "reveal" || finalCtaPhase === "done" ? "final-proof-line is-visible" : "final-proof-line"} aria-hidden="true">Начните с нескольких предложений о желаемом результате.</span>
        </h2>
        <button className="primary-button verification-button" onClick={openForm}>Описать AI‑проект</button>
      </section>

      <footer>
        <a className="logo" href="#top">IN<span>SOL</span></a>
        <address className="footer-contacts" aria-label="Контакты INSOL">
          <a href="tel:+79223856767">+7 (922) 385-67-67</a>
          <a href="mailto:info@inn-sol.ru">info@inn-sol.ru</a>
        </address>
        <nav className="legal-links" aria-label="Документы INSOL">
          <a href="/documents/insol-user-agreement.pdf">Пользовательское соглашение</a>
          <a href="/documents/insol-privacy-policy.pdf">Политика конфиденциальности</a>
          <a href="/documents/insol-public-offer.pdf">Публичная оферта</a>
          <button type="button" className="cookie-settings" onClick={() => setCookieConsent("unknown")}>Настройки cookies</button>
        </nav>
      </footer>

      {cookieConsent === "unknown" && (
        <aside className="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-description">
          <div className="cookie-copy">
            <strong id="cookie-title">Cookies на сайте INSOL</strong>
            <p id="cookie-description">Мы используем только необходимые технические cookies для работы и защиты формы. Они не применяются для аналитики или рекламы. Подробнее — в <a href="/documents/insol-privacy-policy.pdf">Политике конфиденциальности</a>.</p>
          </div>
          <div className="cookie-actions">
            <button type="button" className="primary-button verification-button" onClick={acceptCookies}>Принять только необходимые</button>
          </div>
        </aside>
      )}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className={status === "success" ? "contact-modal contact-modal-success" : "contact-modal"} role="dialog" aria-modal="true" aria-labelledby="form-title">
            {status !== "success" && <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Закрыть">×</button>}
            {status === "success" ? (
              <div className="form-success" role="status" aria-live="polite">
                <svg className="form-success-check" viewBox="0 0 72 72" aria-hidden="true">
                  <circle cx="36" cy="36" r="29" />
                  <path d="M22 37.5 31.5 47 51 27" />
                </svg>
                <h2 id="form-title">Заявка отправлена</h2>
                <p>Спасибо! Описание проекта передано команде INSOL. Мы свяжемся с вами по указанным контактам.</p>
              </div>
            ) : (
              <>
                <h2 id="form-title">Опишите AI‑проект</h2>
                <form onSubmit={submitForm}>
                  <input type="text" name="website_check" className="hp-field" tabIndex={-1} autoComplete="off" />
                  <label>Имя<input name="name" required maxLength={120} autoComplete="name" /></label>
                  <label>E-mail<input type="email" name="email" required maxLength={200} inputMode="email" autoComplete="email" placeholder="name@company.ru" /></label>
                  <label>Телефон (необязательно)<input type="tel" name="phone" maxLength={18} inputMode="tel" autoComplete="tel" placeholder="+7 (000) 000-00-00" pattern="\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}" title="Введите номер в формате +7 (000) 000-00-00" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} /></label>
                  <label>Компания (необязательно)<input name="company" maxLength={200} autoComplete="organization" placeholder="Можно не указывать на первом этапе" /></label>
                  <label className="full-field">Что нужно реализовать?<textarea name="task" required rows={4} maxLength={3000} placeholder="Опишите задачу и желаемый результат своими словами" /></label>
                  <label>Отрасль<select name="industry" defaultValue=""><option value="">Выберите</option><option>Промышленность</option><option>Ритейл</option><option>Финансы</option><option>Автобизнес</option><option>Логистика</option><option>Другое</option></select></label>
                  <label>Ориентировочный бюджет<select name="budget" defaultValue=""><option value="">Пока не определён</option><option>до 3 млн ₽</option><option>3–10 млн ₽</option><option>10–30 млн ₽</option><option>30–100 млн ₽</option><option>более 100 млн ₽</option></select></label>
                  <label>Желаемый срок<input name="deadline" maxLength={160} placeholder="Например: пилот за 3 месяца" /></label>
                  <label>Интеграции (необязательно)<input name="integration" maxLength={500} placeholder="CRM, 1С, телефония, внутренние базы" /></label>
                  <label className="consent full-field"><input type="checkbox" name="consent" required /> <span>Даю согласие на обработку персональных данных в соответствии с <a href="/documents/insol-privacy-policy.pdf">Политикой конфиденциальности</a>.</span></label>
                  <p className="form-legal full-field">Отправляя заявку, вы подтверждаете ознакомление с <a href="/documents/insol-user-agreement.pdf">Пользовательским соглашением</a>.</p>
                  <p className="form-rate-note full-field">Можно отправить не более 2 заявок за 8 минут.</p>
                  {status === "error" && <p className="form-error full-field" role="alert">{formError}</p>}
                  <div className="form-actions full-field"><button type="button" className="cancel-button" onClick={() => setModalOpen(false)}>Отмена</button><button type="submit" className="primary-button verification-button" disabled={status === "sending"}>{status === "sending" ? "Отправляем…" : "Отправить проект"}</button></div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
