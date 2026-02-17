import { promises as fs } from "fs";
import path from "path";

const root = process.cwd();

const services = [
  {
    id: "service-ux-ui-design",
    title: "UX/UI-дизайн под ключ",
    link: "https://sobakapav.ru/services/ux-design",
  },
  {
    id: "service-spot-redesign",
    title: "Точечный редизайн интерфейса",
    link: "https://sobakapav.ru/services/redesign",
  },
  {
    id: "service-new-features",
    title: "Добавление новой функциональности",
    link: "https://sobakapav.ru/services/new-features",
  },
  {
    id: "service-prototype",
    title: "Прототип под инвестиции",
    link: "https://sobakapav.ru/services/prototype",
  },
  {
    id: "service-ui-redesign",
    title: "UI-редизайн",
    link: "https://sobakapav.ru/services/ui-redesign",
  },
  {
    id: "service-research",
    title: "Продуктовое исследование",
    link: "https://sobakapav.ru/services/research",
  },
  {
    id: "service-ux-audit",
    title: "UX-аудит",
    link: "https://sobakapav.ru/services/ux-audit",
  },
  {
    id: "service-ux-outsource",
    title: "UX-отдел на аутсорсе",
    link: "https://sobakapav.ru/services/ux-outsource",
  },
  {
    id: "service-product-team",
    title: "Работа в продуктовой команде",
    link: "https://sobakapav.ru/services/product-team",
  },
  {
    id: "service-content-design",
    title: "Контент-дизайн",
    link: "https://sobakapav.ru/services/content-design",
  },
];

const cases = [
  {
    id: "seatmap",
    title: "Инструмент для создания схем стадионов и концертных площадок",
    preview:
      "Визуальный язык для создания схем рассадки и UI процесса выбора и покупки билетов.",
  },
  {
    id: "electrocardiography",
    title: "Медицинский интерфейс для работы с ЭКГ",
    preview:
      "Создали интерфейс медицинской диагностической платформы для кардиологов. Нарисовали более четырех сотен экранов, но показать пока не можем: NDA. Но можем многое рассказать.",
  },
  {
    id: "broker",
    title: "Аутсорс-исследование пользователей для финансовой компании",
    preview:
      "Провели модерируемое юзабилити-тестирование четырёх ключевых user-flow и замерили Single Usability Metric.",
  },
  {
    id: "anggell-2025",
    title: "Дизайн интерфейса системы управления рестораном",
    preview:
      "На основе MVP создали дизайн интерфейса системы поддержки принятия решений в ресторанном бизнесе.",
  },
  {
    id: "t1",
    title: "Медицинская карта с голосовым заполнением",
    preview:
      "Собрали прототип MVP с удобным привлекательным интерфейсом для внутреннего стартапа компании T1.",
  },
  {
    id: "simed",
    title: "Редизайн модуля записи к врачу",
    preview:
      "Провели редизайн медицинской системы для переезда в веб и улучшили пользовательский опыт.",
  },
  {
    id: "lab4u",
    title: "Аудит сайта и приложения медицинской лаборатории",
    preview:
      "Провели экспертный UX-аудит сценария заказа анализов на сайте и в приложении онлайн-лаборатории после обновления их интерфейсов.",
  },
  {
    id: "joono-ai",
    title: "Исследование пользователей AI-фоторедактора",
    preview:
      "Провели серию пользовательских интервью (кастдевов) и сформулировали гипотезы, которые помогут улучшить мобильное приложение Joono.",
  },
  {
    id: "torba",
    title: "Исследование и дизайн интерфейса личного кабинета",
    preview:
      "Провели UX-исследование и спроектировали дизайн интерфейса личного кабинета программы лояльности крупнейшего ритейлера.",
  },
  {
    id: "valer-ai",
    title: "Редизайн AI-приложения для клиентов автосервиса",
    preview:
      "Интерфейс продукта для первичного осмотра автомобиля с помощью искусственного интеллекта.",
  },
  {
    id: "simplefly",
    title: "Редизайн приложения для проведения сделок",
    preview:
      "Провели оценку существующего интерфейса и интервью с пользователями. На их основе переработали дизайн приложения.",
  },
  {
    id: "prozhito",
    title: "Интерфейс платформы общественной архивистики",
    preview:
      "Провели исследование пользователей, спроектировали и создали интерфейс каталога архивов.",
  },
  {
    id: "dipol",
    title: "Интерфейс приложения визуальной LowCode среды разработки",
    preview: "Создали новую удобную для пользователей версию существующего решения.",
  },
  {
    id: "pushkin-digital",
    title: "Дизайн интерфейса коллекции материалов Пушкинского дома",
    preview:
      "Создали интерфейсы научно-просветительского портала, где представлены рукописи и старые издания Пушкина, пушкинистика и справочные материалы.",
  },
  {
    id: "tmh",
    title: "Платформа дистанционного мониторинга пациентов",
    preview:
      "Разработали интерфейсы личного кабинета врача и мобильного приложения пациента.",
  },
  {
    id: "jeffit",
    title: "Система автоматизации для юридических департаментов",
    preview:
      "Выполнили восемь ТЗ и добавили новую функциональность в существующую систему.",
  },
  {
    id: "hyperus",
    title: "Дизайн интерфейса системы управления IT-инфраструктурой",
    preview:
      "Проанализировали существующую систему, создали новую архитектуру интерфейса и переработали ключевые экраны.",
  },
  {
    id: "easydocs-2024",
    title: "Дизайн интерфейса модуля приема кандидатов на работу",
    preview: "Разработали интерфейс для нового модуля сервиса EasyDocs.",
  },
  {
    id: "elma-bot",
    title: "Дизайн интерфейса lowcode-конструктора чат-ботов",
    preview:
      "Спроектировали интерфейс платформы для создания коммерческих чат-ботов — для пользователей без опыта программирования.",
  },
  {
    id: "otvinta-2024",
    title: "UX-отдел на аутсорсе для строительного интернет-магазина",
    preview: "Новые разделы, новая функциональность и точечные доработки интерфейса.",
  },
  {
    id: "ot-vinta",
    title: "Точечный редизайн интерфейса магазина строительных товаров",
    preview:
      "Сделали сайт более удобным и привлекательным, повысив продажи через него в 2,5 раза.",
  },
  {
    id: "nextons",
    title: "Таск-трекер юридической фирмы",
    preview:
      "Перепроектировали UI ключевых страниц, содержащих все интерфейсные элементы, которые используются в системе.",
  },
  {
    id: "qiwi",
    title: "Конкурентное сравнение трёх систем денежных переводов",
    preview:
      "Провели конкурентное сравнение, построили CJM и план поэтапного изменения интерфейса. Contact, KoronaPay и Unistream.",
  },
  {
    id: "zapovednik",
    title: "UX-аудит и редизайн магазина товаров для животных",
    preview:
      "Провели UX-аудит десктопной и мобильной версий интерфейса по согласованным пользовательским сценариям. Предложили способы улучшить пользовательский опыт.",
  },
  {
    id: "alfastrah-design",
    title: "Дизайн-система для компании «АльфаСтрахование»",
    preview:
      "Разработали дизайн-систему и насытили её UI-элементами. Создали принцип постановки задач для дизайнера интерфейсов.",
  },
  {
    id: "e-gorod-mobile",
    title: "Объединение двух мобильных приложений",
    preview:
      "Бесшовно интегрировали возможности одного приложения в другое, чтобы изменения не вызвали волны негатива со стороны пользователей.",
  },
  {
    id: "onkor",
    title: "Дизайн интерфейса МИС для онкологических клиник",
    preview:
      "Создали удобную современную версию медицинской информационной системы на основе существующей.",
  },
  {
    id: "control-patent",
    title: "Интерфейс мобильного приложения для работы с трудовыми патентами",
    preview:
      "Создали дизайн нового мобильного приложения для работы с трудовыми патентами.",
  },
  {
    id: "avicenna",
    title: "Медицинская информационная система",
    preview:
      "Провели редизайн МИС «Авиценна» при переводе системы в веб. Добавили новую функциональность в существующее решение.",
  },
  {
    id: "stroynastroy",
    title: "Дизайн интерфейса маркетплейса стройматериалов",
    preview:
      "Спроектировали интерфейсы MVP, разработали стилевые решения, протестировали интерфейсы на пользователях и передали в разработку.",
  },
  {
    id: "domotech",
    title: "UX-аудит интерфейса сетевого магазина бытовой техники",
    preview:
      "Провели UX-аудит десктопной и мобильной версий существующего интерфейса по согласованным пользовательским сценариям.",
  },
  {
    id: "control-predpisanie",
    title: "Мобильное приложение для работы с предписаниями",
    preview:
      "Создали дизайн интерфейса нового мобильного приложения для работы с предписаниями от контролирующих органов.",
  },
  {
    id: "pangeo",
    title: "Платформа кибербезопасности",
    preview:
      "Создали дизайн интерфейса узкоспециализированного комплекса информационной безопасности.",
  },
  {
    id: "simetra",
    title: "UX-аудит системы транспортного моделирования",
    preview:
      "Протестировали интерфейс универсальной платформы для транспортного моделирования, предложили и обосновали улучшения.",
  },
];

const writeJson = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const nowIso = () => new Date().toISOString();

const seedServices = async () => {
  const items = [];
  for (const service of services) {
    const payload = {
      schemaVersion: 1,
      id: service.id,
      title: service.title,
      link: service.link,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    items.push({ id: service.id, title: service.title });
    await writeJson(
      path.join(root, "data/services", service.id, "service.json"),
      payload
    );
  }
  await writeJson(path.join(root, "data/services/index.json"), {
    schemaVersion: 1,
    items,
  });
};

const seedCases = async () => {
  const items = [];
  for (const item of cases) {
    const payload = {
      schemaVersion: 1,
      id: item.id,
      link: "",
      clientName: "",
      clientLogoFile: "",
      preview: item.preview,
      title: item.title,
      description: "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    items.push({ id: item.id, title: item.title, clientName: "", serviceIds: [] });
    await writeJson(
      path.join(root, "data/cases", item.id, "case.json"),
      payload
    );
  }
  await writeJson(path.join(root, "data/cases/index.json"), {
    schemaVersion: 1,
    items,
  });
};

await seedServices();
await seedCases();

console.log("Seeded services and cases.");
