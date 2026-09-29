import fs from 'fs';

const DICT_TEXT = `
а a
абс abs
абсолютное absolute
абсолютный absolute
аватар avatar
авто auto
автоматически automatically
автонастройка autotune
автоперезагрузка autoreload
автоперенаправление autoredirect
автоположение autoposition
авторизации authorization
автоскрытие autohide
адрес address
активен active
анализ analysis
анимацией animation
анимацию animation
анимация animation
аппаратным hardware
артефактов artifacts
асинхронная async
ассемблер assembler
атрибут attribute
атрибуты attributes
аудио audio
аудиоданных audiodata
аудиопоток audiostream
аудиосемпла audiosample
аудиосемплов audiosamples
аудиоустройств audiodevices
аудиоустройства audiodevice
аудиоустройствам audiodevices
аудиоустройство audiodevice
база base
байт byte
байта byte
байтам bytes
байтов bytes
байты bytes
баннер banner
барахло junk
без without
беззнаковый unsigned
бит bit
битов bits
битрейт bitrate
битрейта bitrate
битрейтов bitrates
биты bits
блок block
блока block
более more
больше more
большое large
большую large
бордюр border
браковать reject
браузер browser
браузера browser
браузеров browsers
браузерустарел browseroutdated
будет will
буфер buffer
буфера buffer
буфере buffer
буферизации buffering
буферизация buffering
буферы buffers
был was
было was
быстро fast
быть be
важно important
важность importance
вами you
вариант variant
варианта variant
вариантов variants
варианты variants
вас you
вашего your
вашем your
вашу your
ввод input
ведущего leading
ведущий leading
вернул returned
вероятность probability
версией version
версии version
версий versions
версию version
версия version
версияустарела versionoutdated
вертикальное vertical
вертикальной vertical
верхняя top
вид view
видео video
видеоданных videodata
видеодорожка videotrack
видеопоток videostream
видеопотока videostream
видеосемпл videosample
видеосемпла videosample
видеосемпле videosample
видеосемплов videosamples
видюха gpu
видюху gpu
виноват fault
вкладка tab
вкладке tab
вкладки tab
вкладку tab
включаю enabling
включен enabled
включена enabled
включённым enabled
включены enabled
включить enable
вместимость capacity
вместо instead
внимания attention
во in
вовремя ontime
возвращает returns
возможно possible
возможные possible
возобновится resumes
воспроизведение playback
воспроизведению playback
воспроизведения playback
восстанавливаю restoring
восстановить restore
восстановлена restored
восстановление restore
восстановления restore
восстановленные restored
вот here
вращение rotation
времени time
время time
все all
всегда always
всего total
всех all
вставить insert
вставку insertion
вставлять insert
вставляю inserting
встречаются occur
вы you
выбираю choosing
выбор choice
выбора choice
выбран chosen
выбрана chosen
выбранный chosen
выбрано chosen
выбрасываю throwing
выбрать choose
выбросить throw
выгружен unloaded
выгрузку unload
выделения highlight
выделено highlighted
выделить highlight
вызвал caused
вызвать call
вызывает causes
выполнение execution
выполнить execute
выполняется running
выровнить align
высота height
выход exit
выше above
главная main
главного main
главное main
глаз eye
годится fits
горизонтальное horizontal
готов ready
готовность readiness
градиента gradient
границы bounds
громкости volume
громкость volume
группа group
даже even
данные data
данных data
дата date
дату date
даты date
два two
движение motion
движения motion
движка engine
двоичные binary
двойной double
действие action
действия action
декодированием decoding
декодированный decoded
декодировать decode
делать do
делаю doing
детали details
дети children
диапазон range
дискретизации samplerate
длина length
длиною length
длину length
длины length
длит duration
длительности duration
длительность duration
для for
до until
добавить add
добавлен added
добавление addition
добавления addition
добавленное added
добавленный added
добавлено added
добавлены added
добавляемого added
добавляемый added
добавляю adding
довольно quite
документ document
документа document
долго long
долгое long
должна must
дольше longer
домика home
дополнительный extra
допустимые allowed
дорожек tracks
дорожка track
дорожки track
дорожку track
досрочно early
достигнут reached
доступ access
доступе access
доступен available
доступно available
доступность availability
доступные available
дробных fraction
другие other
другой other
его its
единица unit
единицы unit
ерунду nonsense
если if
есть exists
ещё more
ждать wait
ждем waiting
ждет waiting
жду waiting
жив alive
жопа fail
жопу fail
журнал log
за for
забракован rejected
забракованных rejected
забраковано rejected
завершаю finishing
завершена finished
завершение finish
завершения finish
завершенной finished
завершено finished
завершить finish
зависимости dependency
зависит depends
заглушка noop
заголовка header
заголовки headers
заголовков headers
заголовок header
загружаемых loaded
загружается loading
загружать load
загружаю loading
загружен loaded
загружена loaded
загруженной loaded
загруженном loaded
загруженности load
загруженный loaded
загруженных loaded
загружены loaded
загрузил loaded
загрузить load
загрузка load
загрузки load
загрузку load
загрузок loads
загрузчик loader
задана set
задание task
задания task
задать set
задерживать delay
задержка latency
задержку latency
заканчивается ends
заканчиваю finishing
закодирована encoded
закодировать encode
закончилось ended
закрываю closing
закрыт closed
закрытие close
закрытого closed
закрытой closed
закрыть close
заменить replace
замечено noticed
замиранию freeze
заначка stash
занимает takes
занят busy
записаны written
записать write
записи recording
запись recording
запланировать schedule
заполнена filled
заполнения fill
заполненность fill
заполнено filled
заполнитель spacer
запрашиваю requesting
запретить forbid
запрещено forbidden
запрос request
запроса request
запросить request
запросов requests
запрошенного requested
запуск start
запускалка launcher
запускать start
запустить start
запущен started
запятая comma
зароботает works
затемнить darken
затраченное spent
захватом capture
заявленная declared
звук audio
звука audio
здесь here
знак sign
знаковый signed
значение value
значения value
значениями values
значка icon
значок icon
зрителей viewers
зритель viewer
зрителя viewer
игры game
идентификатор id
идет running
идёт running
известен known
из from
изменен changed
изменение change
изменений changes
изменения change
изменилась changed
изменилось changed
изменился changed
изменить change
измерения measurement
изображение image
изображения image
или or
импорт import
импорта import
импортирую importing
имя name
индекс index
индикатор indicator
инициализации init
инициализацию init
инициализация init
инкогнито incognito
иногда sometimes
интервал interval
интернету internet
интерфейса ui
информации info
исключение exception
исключений exceptions
используется used
использую using
исправить fix
истекло expired
истории history
историю history
история history
источник source
исходного source
исходный source
исходных source
исчерпан exhausted
исчерпание exhaustion
исчерпаний exhaustions
исчерпания exhaustion
исчерпано exhausted
их them
ищет seeks
кадр frame
кадра frame
кадрам frames
кадре frame
кадров frames
кадры frames
каждого each
как as
какая which
кампаний campaigns
канал channel
канала channel
канале channel
каналов channels
картинка picture
картинке picture
картинки picture
карты map
касания touch
категории category
качество quality
квартеля quartile
клавиши keys
клавой keyboard
клавы keyboard
классы classes
клиента client
клип clip
клипа clip
ключ key
ключевого key
ключевым key
кнопка button
кнопки button
кнопку button
кнопок buttons
когда when
код code
кодек codec
кодека codec
кодеки codecs
кодеков codecs
кодирования encoding
коды codes
колеса wheel
колесом wheel
количество count
команды team
компилировать compile
компиляция compile
компьютере computer
конец end
конкретной specific
конструктор constructor
контекст context
конца end
копирование copy
копировании copy
копирования copy
копировать copy
копирую copying
копия copy
которого which
которое which
которые which
которых which
красным red
кратен multiple
кратковременные brief
краткое short
кроме except
крутилка spinner
куда where
куча heap
кучи heap
кучу heap
кэш cache
левая left
лево left
левый left
лимит limit
логин login
локальный local
любое any
макс max
максимальная maximum
максимальное maximum
максимум maximum
маска mask
массив array
массива array
масштабирование scale
масштабировать scale
медленно slow
между between
менее less
меню menu
меняете change
менять change
меняю changing
метаданные metadata
метаданных metadata
метапоток metastream
метка label
метку label
метод method
мешает interferes
мешают interfere
миллисекунды milliseconds
мин min
минимальная minimum
минимальное minimum
минимум minimum
минус minus
многоточие ellipsis
мобильная mobile
мобильного mobile
мобильное mobile
мог could
модуль module
может may
можно can
монитора monitor
мыши mouse
на on
наблюдаемые observed
наблюдатель observer
нажат pressed
нажата pressed
нажатие press
название title
названия title
найден found
найдена found
найти find
накопившихся accumulated
например example
нарушают violate
настоящих real
настраиваемая custom
настроек settings
настроить configure
настройка setting
настройках settings
настройки settings
настройку setting
начала start
начало start
началом start
начальная initial
начальное initial
начальные initial
начальный initial
начать start
начиналось started
начинать start
начинаю starting
начиная starting
начнется starts
наш our
нашего our
нашу our
не not
неактивна inactive
небольшая small
невозможно impossible
недопустимого invalid
недостаточно insufficient
недостаточное insufficient
недоступен unavailable
недоступна unavailable
незавершенный unfinished
незагруженный unloaded
незагруженных unloaded
неизвестная unknown
неизвестно unknown
неизвестные unknown
неизвестный unknown
ней it
необработанные unhandled
необработанных unhandled
неоформлена unfollowed
неперенаправляемый noredirect
неперехватывать nocapture
неправильно wrong
неприятные unpleasant
непрозрачность opacity
непросмотренного unwatched
непросмотрено unwatched
непрочитано unread
непустая nonempty
нескаченных undownloaded
нескольких several
несколько several
нестабильная unstable
нет none
неточное inaccurate
неуведомлять nonotify
неудачную failed
нечего nothing
нечто something
ниже below
нижний bottom
нижняя bottom
низкая low
ними them
ничего nothing
но but
новое new
новой new
новости news
новость news
новые new
новый new
новых new
номер number
нужна needed
нужная needed
нужно need
нужны needed
нулевых zero
нули zeros
обещание promise
обещания promise
области area
область area
обмена clipboard
обнаружен detected
обновить update
обновлен updated
обновление update
обновления update
обновлены updated
обновляется updating
обнюхать probe
оболочка shell
оболочку shell
обработать handle
обработка handling
обработки handling
обработчик handler
обработчики handlers
обращайте pay
обход bypass
общее general
общения communication
объединить merge
объект object
обычного normal
обычном normal
ограничить clamp
один one
одна one
одновременная concurrent
одновременных concurrent
одного one
одном one
ожидает awaits
ожидание wait
ожидания wait
означает means
ой oops
окак ok
окна window
окно window
окончание ending
округлить round
они they
оперативка ram
оперативку ram
операцию operation
операция operation
описание description
опорных reference
определен defined
определение definition
оригинальная original
освободить free
основа base
особенность quirk
осталось left
остальное rest
останавливаю stopping
остановить stop
остановка stop
остановкам stops
остановлен stopped
остановок stops
от from
ответ response
ответа response
ответе response
ответил replied
ответить reply
отдельно separate
отзыв feedback
отказано denied
отказаться giveup
отказов failures
откладывать defer
откладываю deferring
отклонение deviation
отключаю disabling
отключена disabled
отключить disable
открываю opening
открыт open
открытие open
открытия open
открыто open
открытого open
открытое open
открыть open
откуда from
отладка debug
отложена deferred
отложенного deferred
отложенное deferred
отложено deferred
откладывать defer
отматываю rewinding
отмена cancel
отменена cancelled
отменено cancelled
отменить cancel
отмену cancel
отмены cancel
отменяю cancelling
отмотать rewind
относительное relative
отношение ratio
отобразить render
отобраны selected
отписаться unfollow
отправитель sender
отправить send
отправки sending
отправлен sent
отправляю sending
отпускание release
отпустить release
отпущена released
отрицательная negative
отслеживать follow
отступок padding
отсутствие absence
отсылаю sending
отчет report
отчета report
оформление theme
оформления theme
очень very
очереди queue
очередь queue
очистить clear
ошибка error
ошибками errors
ошибки error
ошибку error
ошибок errors
пакет packet
пакета packet
памяти memory
память memory
панели panel
панель panel
пара pair
параметр parameter
параметра parameter
параметрах parameters
параметров parameters
параметры parameters
пассивный passive
пауза pause
паузу pause
паузы pause
первого first
первую first
первый first
перевести convert
перевод translation
передан passed
передать pass
перезагружаю reloading
перезагрузить reload
перезагрузка reload
перезагрузки reload
перезагрузку reload
переключаете switching
переключение switch
переключении switch
переключить toggle
перекрытие overlap
перематывать seek
перематываю seeking
переменная variable
переменные variables
переменный variable
переместить move
перемотать seek
перемотка seek
перемотки seek
перенаправить redirect
перенаправление redirect
перенаправлять redirect
переполнен overflowed
переполнение overflow
переполнений overflows
переполнения overflow
переполнено overflowed
перепрыгиваю skipping
перетаскиваемой dragged
перетаскивание drag
перетаскивания drag
перетаскивать drag
перехват capture
перехвата capture
перехватить capture
перехватывать capture
перехожу going
перечисление enum
песочные sand
печенек cookies
печенька cookie
печеньки cookie
печеньку cookie
планшета tablet
плеера player
плейлист playlist
плохое bad
плюс plus
по by
поведение behavior
поврежден damaged
повреждение damage
повреждены damaged
повтор replay
повтора replay
повторить retry
повторно again
повторять repeat
повышения increase
поддержать support
поддерживаемая supported
поддерживает supports
подключения connection
подключитесь connect
подключить connect
подошёл fit
подписаться follow
подписка follow
подписку follow
подписчиков followers
подпись signature
подробно detailed
подсказка tooltip
подстановка substitution
подсчитать count
подтвердить confirm
позиции position
позицию position
позиция position
позывной callsign
поймано caught
пока while
показан shown
показанной shown
показать show
показывать show
показывают show
покидание leave
поколение generation
поле field
полная full
полностью fully
полноценный full
полноэкранного fullscreen
полноэкранный fullscreen
положение position
положительное positive
получаю getting
получен received
получение receipt
получения receipt
получено received
получилось succeeded
получить get
поля fields
помойка trash
помойке trash
помойки trash
помойку trash
понижения decrease
понравился liked
попробуйте try
попыток attempts
порог threshold
порядковый ordinal
послать dispatch
после after
последнего last
последнее last
последней last
последний last
последними last
последняя last
последовательности sequence
посмотреть look
постоянная persistent
постоянные persistent
постоянный persistent
посылать send
посылаю sending
посылке send
посылки send
потери loss
потерь losses
потерю loss
поток stream
потока stream
потоке stream
потому because
почта mail
пошло went
появлению appearance
правая right
правил rules
право right
превышена exceeded
превышено exceeded
превью preview
предел limit
пределы limits
предотвратить prevent
предполагаемая estimated
предпоследнего previous
предустановка preset
предустановки preset
предустановок presets
предыдущая previous
предыдущего previous
преобразован converted
преобразование conversion
преобразования conversion
преобразованные converted
преобразованный converted
преобразовано converted
преобразователь converter
преобразовать convert
преобразую converting
префикс prefix
префикса prefix
при at
прибавить add
приводят lead
приглушить mute
прилично decent
применить apply
примерный approximate
принято accepted
принять accept
приостанавливаю pausing
приостановки pause
приостановлено paused
прихода arrival
причина reason
причины reason
проблема problem
проблемному problem
проблемы problems
проверить assert
проверка check
проверки check
проверку check
проверяется checking
продлятся last
продолжительность duration
прозрачность opacity
проигрывателе player
проигрывателем player
проигрыватель player
проигрывателя player
произвольной arbitrary
произошло happened
пройдена passed
прокрутить scroll
прокрутка scroll
прокрутки scroll
прокрутку scroll
прокручен scrolled
прокси proxy
пропаданию dropout
пропускаю skipping
пропустить skip
пропущенные skipped
пропущенных skipped
пропущено skipped
пропущены skipped
просматривать watch
просмотр watch
просмотренное watched
просмотрено watched
просмотром watch
просмотру watch
протухания expiry
протухнет expires
протухший stale
профиль profile
процессор cpu
процессора cpu
прочесть read
прочитаны read
прочтение reading
прошедшее elapsed
прошествии after
прошло passed
прямая live
прямой live
пульс pulse
пункт item
пункта item
пуст empty
пусто empty
пути path
путь path
работа work
работе work
работу work
работы work
рабочем working
рабочий working
равен equal
равны equal
радио radio
раз times
разбираемый parsed
разбора parse
развертки scan
различается differs
размер size
размера size
разница difference
разных different
разобран parsed
разобранного parsed
разобранный parsed
разобрать parse
разрешение resolution
разрешения permission
разрешено allowed
разрешить allow
разрыв discontinuity
разрядов digits
расположен placed
рассинхронизация desync
расстояния distance
рассчитать calculate
рассчитывается calculated
рассчитываются calculated
растет grows
растягивание stretch
расчитать calculate
расширение extension
расширений extensions
расширения extension
расшифровка decode
реакцию reaction
реальная real
редкая rare
режим mode
режима mode
режиме mode
резерва reserve
результат result
результата result
результаты results
реклама ad
рекламного ad
рекламный ad
рекламных ad
рекламой ad
рекламу ad
рекламы ad
реплика replica
реплики replica
решение decision
рисуются drawn
ролика adroll
роликов adrolls
русский russian
сайта site
сбои failures
сбоку side
сбор collect
сбрасываю resetting
сбросить reset
свежий fresh
светить show
свои own
свойства property
свойство property
связи link
сегмент segment
сегмента segment
сегменте segment
сегментов segments
сегменты segments
сейчас now
секунд seconds
секундах seconds
секунды seconds
секции section
секция section
селектор selector
семпл sample
семпла sample
семплов samples
сервер server
сервера server
сервере server
сервером server
серверу server
середина middle
середине middle
серьёзная serious
серьезная serious
сессии session
сессия session
сети network
сеть network
сетью network
сжатие compression
сжатия compression
сжать compress
сжечь burn
сжигаю burning
сильная strong
символ char
символов chars
символы chars
скачано downloaded
скаченном downloaded
скачивание download
скачивания download
скачиваниями downloads
сколько howmany
скорости speed
скорость speed
скрипт script
скрываю hiding
скрыт hidden
скрыть hide
следить watch
следующая next
следующего next
следующий next
слежение tracking
слежения tracking
слишком too
служебной overhead
случайное random
смена switch
смену switch
смены switch
смещение offset
смог could
смотрите see
сначала first
снимаю clearing
снова again
событие event
событий events
события event
событиями events
совместный joint
совпадение match
содержимое content
соединение connection
соединения connection
создан created
создания creation
создать create
создаю creating
сообщение message
сообщений messages
сообщения message
сообщить report
сортировать sort
состав composition
состояние state
состояния state
состыковать join
сохранение save
сохранения save
сохраненное saved
сохраненный saved
сохранить save
сохранять save
списка list
списке list
списки lists
списков lists
список list
способ method
справка help
справки help
справку help
среднего average
среднее average
средней average
средняя average
ссылка link
ссылки links
ссылку link
ссылок links
ставлю setting
стандарт standard
стандарта standard
старое old
старой old
старше older
старый old
статистика stats
статистике stats
статистики stats
статистику stats
статы stats
стили styles
стиль style
сторона side
сторонние thirdparty
сторонних thirdparty
стороны side
страница page
страницу page
страницы page
страшного scary
стрелками arrows
строка string
строке string
строки string
строку string
структура structure
структуры structure
субтитров subtitles
субтитры subtitles
сумма sum
счастье happiness
счетчик counter
счетчика counter
считаться counted
таблиц tables
таблица table
таймаут timeout
таймер timer
таймера timer
так so
также also
тащилка draghandle
тащится dragged
тег tag
тега tag
текст text
текущее current
текущей current
текущую current
тела body
тело body
тем those
тема theme
темасветлая lighttheme
тёмная dark
темная dark
тему theme
теоретически theoretically
теряет loses
тип type
типа type
типы types
то that
того that
токен token
токена token
токеном token
толщина bitrate
только only
том that
точек points
точке point
точное exact
точность precision
трансляции broadcast
трансляцию broadcast
трансляция broadcast
транспортного transport
транспортный transport
третий third
тухлый stale
тыкание click
убиваю killing
уведомить notify
уведомление notice
уведомлять notify
увеличенным increased
увеличивается increases
увеличиваю increasing
увеличить increase
увиденные seen
увидит sees
удалена removed
удаление removal
удаления removal
удалённого removed
удаленного removed
удалено removed
удалены removed
удалить remove
удалось succeeded
удаляю removing
удержать hold
уже already
узел node
узла node
указанного specified
указатель pointer
указателя pointer
укороченный shortened
уменьшился decreased
умолчанию default
уникальный unique
управление controls
уровень level
условие condition
успевает keeps
установка install
установки install
устраивает suits
устройств devices
устройства device
устройство device
утеряна lost
ухудшить worsen
файл file
файла file
файлов files
фактическая actual
фигня junk
флаги flags
флажок checkbox
фокус focus
фокусник focus
фон background
фона background
форма form
форматировать format
форму form
формы form
фрагмент fragment
фрейм frame
функции function
функцию function
функция function
хаос chaos
хвосты leftovers
хеши hashes
холст canvas
хранилища storage
хранилище storage
хранить keep
хромой chrome
цвет color
цвета color
цветом color
целое integer
цепочка chain
цепочку chain
части part
часто often
частота rate
частотой rate
частоту rate
частоты rate
частые frequent
часть part
часы clock
чат chat
чата chat
чате chat
чем than
через via
чересстрочное interlaced
чисел numbers
числа number
числе number
число number
читалка reader
чтения read
что what
чтобы to
чужая other
шаг step
шанс chance
ширина width
шкала scale
шкалы scale
шрифта font
щелчок click
экземпляр instance
экран screen
экрана screen
экспорт export
экспорта export
экспортирую exporting
элемент element
элемента element
этапах stages
этих these
это this
этого this
этой this
этот this
эфир air
ядра cores
язык language
языка language
языки languages
языков languages
яму pit
вышеавода aboveinput
оборзеватель useragent
автоскрытия autohide
сразу immediately
р r
бесконечная infinite
вот here
ид id
и and
в in
у at
к to
медиа media
медиасегмент mediasegment
медиапотока mediastream
медиаустройств mediadevices
медиаустройства mediadevice
медиаустройство mediadevice
ауд audio
экг eg
мно set
клиент client
клиентx clientx
клиентy clienty
автоперезагрузок autoreloads
перезагрузок reloads
протухнет expires
ресурса resource
url url
мбуф mbuf
настройки settings
ам map
вд vd
вп vp
дор track
кб kb
мб mb
мл mark
мн set
мо objs
мп mp
мс strs
му mu
мц mc
мч nums
нська nsk
обр obr
отн rel
перв first
посл last
рв rv
смещ offset
сэл els
тп tp
ч1 n1
ч2 n2
ч32 n32
ы idx
г g
л is
о o
п p
с s
ф fn
ч n
к count
м m
уз node
эл el
буф buf
бф bf
суз nodes
горизвырав halign
можнотыкать clickable
недляповтора notreplay
дляповтора forreplay
окнооткрыто windowopen
элементпанели panelitem
прямаятрансляция livestream
проверкацвета colortest
нетвидео novideo
нетзвука noaudio
скрытьчат hidechat
скрытиерекламы hidingads
качествобезрекламы adfreequality
началорекламы adstart
конецрекламы adend
режимрекламы admode
темасветлая lighttheme
проигрывательичат playerandchat
категориятрансляции broadcastcategory
названиетрансляции broadcasttitle
типтрансляции broadcasttype
задержкатрансляции broadcastlatency
варианттрансляции broadcastvariant
группачат chatgroup
группанастроек settingsgroup
группацвета colorgroup
группаинтерфейс uigroup
группаосновные maingroup
группавсенастройки allsettingsgroup
группабуферизация bufferinggroup
заголовокнастроек settingsheader
индикаторпрокрутки scrollindicator
текстновостей newstext
обновлениерасширения extensionupdate
адресчата chataddress
адресзаписи recordingaddress
копироватьадресканала copychanneladdress
копироватьадрестрансляции copybroadcastaddress
переключитьчат togglechat
перезагрузитьчат reloadchat
переключитьпаузу togglepause
переключитьтрансляцию togglebroadcast
переключитьстатистику togglestats
переключитьсубтитры togglesubtitles
переключитьприглушить togglemute
переключитьполноэкранный togglefullscreen
переключитькартинкавкартинке togglepip
переключитьглавноеменю togglemainmenu
открытьновости opennews
открытьсправку openhelp
закрытьновости closenews
закрытьстатистику closestats
отложитьновости defernews
отправитьотзыв sendfeedback
создатьклип createclip
менятьгромкостьколесом changewheelvolume
масштабироватьизображение scaleimage
анимацияинтерфейса uianimation
автоположениечата chatautoposition
горизонтальноеположениечата chathorizontalposition
вертикальноеположениечата chatverticalposition
положениечата chatposition
состояниезакрытогочата closedchatstate
одновременныхзагрузок concurrentloads
выборскорости speedchoice
выборфайладляимпортанастроек importsettingsfile
импортнастроек importsettings
экспортнастроек exportsettings
сброситьнастройки resetsettings
ужатьнастройки compresssettings
ужатьглавноеменю compressmainmenu
главноеменю mainmenu
главнаятаблица maintable
верхняяпанель toppanel
нижнийотступчата chatbottompadding
высотавводасообщения messageinputheight
высотазаголовка headerheight
ширинаспискасмайликов emotelistwidth
толщинаканала channelbitrate
толщинасегмента segmentbitrate
разрешениевидео videoresolution
частотакадров framerate
сжатиевидео videocompression
сжатиезвука audiocompression
битрейтзвука audiobitrate
количествозрителей viewercount
количестворекламы adcount
частотарекламы adrate
длительностьповтора replayduration
длительностьпросмотра watchduration
размербуфера buffersize
размеринтерфейса uisize
размерчата chatsize
растягиваниебуфера bufferstretch
интервалвтоскрытия autohideinterval
интервалобновления updateinterval
началовоспроизведения playbackstart
проверкацветафон colortestbg
чатвверху chatontop
чатвнизу chatonbottom
чатслева chatonleft
чатсправа chatonright
левыйщелчок leftclick
изменилосьсостояние statechanged
полученыметаданныеканала channelmetareceived
полученыметаданныезрителя viewermetareceived
полученыметаданныетрансляции broadcastmetareceived
выбранварианттрансляции broadcastvariantchosen
переполненбуфер bufferoverflowed
измениласьпредустановка presetchanged
ссылкакнопка linkbutton
ссылкасообщения messagelink
текстсообщения messagetext
ходотправки sendprogress
сбойотправки sendfailed
идетотправка sendprogress
браузерустарел browseroutdated
версияустарела versionoutdated
отступкона windowpadding
каналстаты channelstats
статы stats
`;

const dict = new Map();
for (const line of DICT_TEXT.split('\n')) {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('#')) continue;
	const space = trimmed.indexOf(' ');
	if (space < 1) continue;
	dict.set(trimmed.slice(0, space).toLowerCase().replaceAll('ё', 'е'), trimmed.slice(space + 1));
}

const ENDINGS = ['иями', 'остями', 'ениями', 'ость', 'ение', 'ения', 'ами', 'ями', 'ого', 'ему', 'ому', 'ыми', 'ими', 'ах', 'ях', 'ов', 'ев', 'ей', 'ий', 'ый', 'ой', 'ая', 'ое', 'ее', 'ые', 'ие', 'ам', 'ям', 'ом', 'ем', 'ую', 'ию', 'ия', 'ья', 'ью', 'а', 'я', 'у', 'ю', 'ы', 'и', 'е', 'о', 'ь'];

function lookupWord(raw) {
	const word = raw.toLowerCase().replaceAll('ё', 'е');
	if (dict.has(word)) return dict.get(word);
	for (const end of ENDINGS) {
		if (word.length - end.length < 3 || !word.endsWith(end)) continue;
		const stem = word.slice(0, -end.length);
		for (const extra of ['', 'а', 'я', 'ь', 'й', 'е', 'о', 'и']) {
			if (dict.has(stem + extra)) return dict.get(stem + extra);
		}
	}
	return null;
}

const dictWords = [...dict.keys()].sort((a, b) => b.length - a.length);

function greedySplit(lower) {
	const parts = [];
	let i = 0;
	while (i < lower.length) {
		let found = null;
		for (const word of dictWords) {
			if (word.length >= 2 && lower.startsWith(word, i)) {
				found = word;
				break;
			}
		}
		if (!found) return null;
		parts.push(found);
		i += found.length;
	}
	return parts;
}

function cap(word) {
	if (!word) return word;
	return word[0].toUpperCase() + word.slice(1);
}

function meaning(word, index) {
	const lower = word.toLowerCase().replaceAll('ё', 'е');
	if (lower === 'к') return index === 0 ? 'count' : 'to';
	if (lower === 'и') return 'and';
	if (lower === 'в') return 'in';
	if (lower === 'у') return 'at';
	if (lower === 'с' && index > 0) return 'with';
	return lookupWord(lower);
}

function splitRuns(text) {
	return text.split(/(?<=[А-Яа-яЁё])(?=[^А-Яа-яЁё])|(?<=[^А-Яа-яЁё])(?=[А-Яа-яЁё])|(?<=[а-яё])(?=[А-ЯЁ])|(?<=[А-ЯЁ])(?=[А-ЯЁ][а-яё])/u).filter(Boolean);
}

function translateSegment(segment) {
	if (!/[А-Яа-яЁё]/.test(segment)) return segment;
	if (segment === segment.toUpperCase()) {
		const parts = greedySplit(segment.toLowerCase().replaceAll('ё', 'е')) || [segment.toLowerCase()];
		return parts.map((part, index) => (meaning(part, index) || part).toUpperCase()).join('');
	}
	const runs = splitRuns(segment);
	let out = '';
	let wordIndex = 0;
	for (const run of runs) {
		if (!/[А-Яа-яЁё]/.test(run)) {
			out += run;
			continue;
		}
		const lower = run.toLowerCase().replaceAll('ё', 'е');
		const parts = meaning(lower, wordIndex) ? [lower] : (greedySplit(lower) || [lower]);
		for (let partIndex = 0; partIndex < parts.length; ++partIndex) {
			const en = meaning(parts[partIndex], wordIndex) || parts[partIndex];
			const upper = partIndex > 0 || /[А-ЯЁ]/.test(run[0]);
			out += wordIndex === 0 && !upper ? en[0].toLowerCase() + en.slice(1) : cap(en);
			wordIndex++;
		}
	}
	return out;
}

function translateIdent(ident) {
	return ident.split(/([_-])/).map(part => part === '_' || part === '-' ? part : translateSegment(part)).join('');
}

const FILES = [
	'src/content/content.js',
	'src/content/content.css',
	'src/content/dropspatch.js',
	'src/content/pagehook.js',
	'src/content/gqltoken.js',
	'src/player/player.js',
	'src/player/player.css',
	'src/player/player.html',
	'src/player/worker.js',
	'src/player/report.html',
	'src/player/report.css',
	'src/player/pointerevent.js',
	'src/player/asmjs.js',
	'src/shared/common.js',
	'src/shared/common.css'
];

const identRe = /[A-Za-z0-9_]*[А-Яа-яЁё][A-Za-z0-9_А-Яа-яЁё]*/g;
const idents = new Map();
for (const file of FILES) {
	const text = fs.readFileSync(file, 'utf8');
	for (const ident of text.match(identRe) || []) {
		idents.set(ident, (idents.get(ident) || 0) + 1);
	}
}

const translated = new Map();
const collisions = new Map();
for (const ident of idents.keys()) {
	const OVERRIDES = new Map([['Узел', 'byId']]);
	let en = OVERRIDES.get(ident) || translateIdent(ident);
	if (en === ident) {
		fs.appendFileSync('/tmp/ru-en-same.txt', ident + '\n');
		continue;
	}
	if (collisions.has(en) && collisions.get(en) !== ident) {
		let n = 2;
		while (collisions.has(en + n)) n++;
		en = en + n;
	}
	collisions.set(en, ident);
	translated.set(ident, en);
}

const missing = new Map();
function noteMissing(word) {
	const key = word.toLowerCase().replaceAll('ё', 'е');
	if (!lookupWord(key) && !greedySplit(key)) missing.set(key, (missing.get(key) || 0) + 1);
}

const apply = process.argv.includes('--apply');
const ordered = [...translated.entries()].sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceIdents(text) {
	for (const [ru, en] of ordered) {
		const re = new RegExp(`(?<![A-Za-z0-9_\\u0400-\\u04FF])${escapeRegExp(ru)}(?![A-Za-z0-9_\\u0400-\\u04FF])`, 'g');
		text = text.replace(re, en);
	}
	return text;
}

function protectTitles(text) {
	const saved = [];
	const out = text.replace(/title="[^"]*"/g, match => {
		saved.push(match);
		return `title="__TITLE_${saved.length - 1}__"`;
	});
	return {out, saved};
}

function restoreTitles(text, saved) {
	return text.replace(/title="__TITLE_(\d+)__"/g, (_, index) => saved[Number(index)]);
}

if (apply) {
	const common = fs.readFileSync('src/shared/common.js', 'utf8');
	const keys = [...common.matchAll(/^\t\t([^\s:]+):/gm)].map(match => match[1]);
	const map = {};
	for (const key of keys) {
		if (translated.has(key)) map[key] = translated.get(key);
	}
	fs.writeFileSync('/tmp/settings-map.json', JSON.stringify(map, null, '\t'));
	for (const file of FILES) {
		let text = fs.readFileSync(file, 'utf8');
		const html = file.endsWith('.html');
		const protectedTitles = html ? protectTitles(text) : null;
		text = replaceIdents(protectedTitles ? protectedTitles.out : text);
		if (protectedTitles) text = restoreTitles(text, protectedTitles.saved);
		fs.writeFileSync(file, text);
	}
}

const sample = [...translated.entries()].sort((a, b) => idents.get(b[0]) - idents.get(a[0])).slice(0, 40);
console.log('idents', idents.size, 'translated', translated.size, 'collisions', [...collisions.keys()].length);
let same = 0;
for (const [ru, en] of translated) if (/[А-Яа-яЁё]/.test(en)) same++;
console.log('still cyrillic', same);
console.log('--- top ---');
for (const [ru, en] of sample) console.log(`${idents.get(ru)}\t${ru} => ${en}`);

const leftovers = [];
for (const [ru, en] of translated) {
	if (/[А-Яа-яЁё]/.test(en)) leftovers.push(`${ru} => ${en}`);
}
fs.writeFileSync('/tmp/ru-en-leftovers.txt', leftovers.join('\n'));
console.log('leftovers', leftovers.length);
if (apply) {
	const settings = fs.readFileSync('src/shared/common.js', 'utf8');
	console.log('applied');
}
