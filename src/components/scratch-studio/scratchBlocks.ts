import * as Blockly from 'blockly';

export const SCRATCH_COLORS = {
  motion: '#4C97FF',
  looks: '#9966FF',
  sound: '#CF63CF',
  events: '#FFBF00',
  control: '#FFAB19',
  sensing: '#5CB1D6',
  variables: '#FF8C1A',
  operators: '#59C059',
};

// Định nghĩa các khối lệnh phong cách Scratch 3.0
export function registerScratchBlocks() {
  // Tránh đăng ký trùng lặp nếu đã đăng ký
  if (Blockly.Blocks['scratch_when_flag_clicked']) {
    return;
  }

  Blockly.defineBlocksWithJsonArray([
    // ==========================================
    // 1. EVENTS (SỰ KIỆN - VÀNG #FFBF00)
    // ==========================================
    {
      type: 'scratch_when_flag_clicked',
      message0: 'khi bấm vào cờ xanh ⛳',
      nextStatement: null,
      colour: SCRATCH_COLORS.events,
      tooltip: 'Bắt đầu chạy kịch bản khi bấm Cờ Xanh trên Sân Khấu',
      helpUrl: '',
    },
    {
      type: 'scratch_when_sprite_clicked',
      message0: 'khi bấm vào nhân vật 🐱',
      nextStatement: null,
      colour: SCRATCH_COLORS.events,
      tooltip: 'Chạy kịch bản khi học sinh nhấp chuột vào chú Mèo',
      helpUrl: '',
    },
    {
      type: 'scratch_when_key_pressed',
      message0: 'khi bấm phím %1 ⌨️',
      args0: [
        {
          type: 'field_dropdown',
          name: 'KEY_OPTION',
          options: [
            ['phím cách (Space)', 'space'],
            ['mũi tên lên ⬆️', 'ArrowUp'],
            ['mũi tên xuống ⬇️', 'ArrowDown'],
            ['mũi tên phải ➡️', 'ArrowRight'],
            ['mũi tên trái ⬅️', 'ArrowLeft'],
            ['bất kỳ phím nào', 'any'],
          ],
        },
      ],
      nextStatement: null,
      colour: SCRATCH_COLORS.events,
      tooltip: 'Kích hoạt kịch bản khi nhấn phím trên bàn phím',
    },
    {
      type: 'scratch_broadcast_message',
      message0: 'phát tin nhắn %1 📢',
      args0: [
        {
          type: 'field_input',
          name: 'MESSAGE',
          text: 'thông_báo_1',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.events,
      tooltip: 'Gửi tin nhắn phát thanh đến tất cả các nhân vật',
    },
    {
      type: 'scratch_when_receive_message',
      message0: 'khi nhận tin nhắn %1 📨',
      args0: [
        {
          type: 'field_input',
          name: 'MESSAGE',
          text: 'thông_báo_1',
        },
      ],
      nextStatement: null,
      colour: SCRATCH_COLORS.events,
      tooltip: 'Bắt đầu kịch bản khi nhận được tin nhắn đã chỉ định',
    },

    // ==========================================
    // 2. MOTION (CHUYỂN ĐỘNG - XANH DƯƠNG #4C97FF)
    // ==========================================
    {
      type: 'scratch_move_steps',
      message0: 'di chuyển %1 bước ➡️',
      args0: [
        {
          type: 'field_number',
          name: 'STEPS',
          value: 10,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.motion,
      tooltip: 'Di chuyển nhân vật theo hướng hiện tại',
    },
    {
      type: 'scratch_turn_right',
      message0: 'quay phải ↷ %1 độ',
      args0: [
        {
          type: 'field_number',
          name: 'DEGREES',
          value: 15,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.motion,
      tooltip: 'Xoay nhân vật sang phải theo chiều kim đồng hồ',
    },
    {
      type: 'scratch_turn_left',
      message0: 'quay trái ↶ %1 độ',
      args0: [
        {
          type: 'field_number',
          name: 'DEGREES',
          value: 15,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.motion,
      tooltip: 'Xoay nhân vật sang trái ngược chiều kim đồng hồ',
    },
    {
      type: 'scratch_goto_xy',
      message0: 'đi tới điểm x: %1 y: %2',
      args0: [
        {
          type: 'field_number',
          name: 'X',
          value: 0,
        },
        {
          type: 'field_number',
          name: 'Y',
          value: 0,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.motion,
      tooltip: 'Đặt vị trí nhân vật đến tọa độ (x, y) trên sân khấu',
    },
    {
      type: 'scratch_point_direction',
      message0: 'đặt hướng bằng %1 độ',
      args0: [
        {
          type: 'field_number',
          name: 'DIRECTION',
          value: 90,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.motion,
      tooltip: 'Đặt góc xoay: 90 (phải), -90 (trái), 0 (lên), 180 (xuống)',
    },
    {
      type: 'scratch_change_x_by',
      message0: 'thay đổi x một lượng %1',
      args0: [
        {
          type: 'field_number',
          name: 'DX',
          value: 10,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.motion,
      tooltip: 'Thay đổi tọa độ X theo chiều ngang',
    },
    {
      type: 'scratch_change_y_by',
      message0: 'thay đổi y một lượng %1',
      args0: [
        {
          type: 'field_number',
          name: 'DY',
          value: 10,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.motion,
      tooltip: 'Thay đổi tọa độ Y theo chiều dọc',
    },
    {
      type: 'scratch_bounce_on_edge',
      message0: 'bật lại nếu chạm cạnh 🔲',
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.motion,
      tooltip: 'Nếu chạm mép sân khấu thì quay đầu ngược lại',
    },

    // ==========================================
    // 3. LOOKS (NGOẠI HÌNH - TÍM #9966FF)
    // ==========================================
    {
      type: 'scratch_say_for_secs',
      message0: 'nói %1 trong %2 giây 💬',
      args0: [
        {
          type: 'field_input',
          name: 'MESSAGE',
          text: 'Xin chào!',
        },
        {
          type: 'field_number',
          name: 'SECS',
          value: 2,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.looks,
      tooltip: 'Hiển thị bóng thoại của nhân vật trong số giây chỉ định',
    },
    {
      type: 'scratch_say',
      message0: 'nói %1 💬',
      args0: [
        {
          type: 'field_input',
          name: 'MESSAGE',
          text: 'Xin chào!',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.looks,
      tooltip: 'Hiển thị bóng thoại của nhân vật liên tục',
    },
    {
      type: 'scratch_change_size_by',
      message0: 'thay đổi kích thước một lượng %1',
      args0: [
        {
          type: 'field_number',
          name: 'CHANGE',
          value: 10,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.looks,
      tooltip: 'Tăng hoặc giảm kích thước phần trăm của nhân vật',
    },
    {
      type: 'scratch_set_size_to',
      message0: 'đặt kích thước thành %1 %',
      args0: [
        {
          type: 'field_number',
          name: 'SIZE',
          value: 100,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.looks,
      tooltip: 'Đặt kích thước nhân vật (100% là kích thước chuẩn)',
    },
    {
      type: 'scratch_show',
      message0: 'hiện 👁️',
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.looks,
      tooltip: 'Hiển thị nhân vật trên sân khấu',
    },
    {
      type: 'scratch_hide',
      message0: 'ẩn 🙈',
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.looks,
      tooltip: 'Ẩn nhân vật khỏi sân khấu',
    },

    // ==========================================
    // 4. SOUND (ÂM THANH - HỒNG #CF63CF)
    // ==========================================
    {
      type: 'scratch_play_sound_meow',
      message0: 'phát âm thanh Meo Meo 🐱',
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.sound,
      tooltip: 'Phát tiếng kêu Meo Meo vui nhộn',
    },
    {
      type: 'scratch_play_drum',
      message0: 'đánh trống nhịp %1 trong %2 giây 🥁',
      args0: [
        {
          type: 'field_number',
          name: 'DRUM',
          value: 1,
        },
        {
          type: 'field_number',
          name: 'SECS',
          value: 0.25,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.sound,
      tooltip: 'Phát âm thanh trống theo nhịp',
    },

    // ==========================================
    // 5. CONTROL (ĐIỀU KHIỂN - CAM #FFAB19)
    // ==========================================
    {
      type: 'scratch_wait_secs',
      message0: 'đợi %1 giây ⏳',
      args0: [
        {
          type: 'field_number',
          name: 'SECS',
          value: 1,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.control,
      tooltip: 'Tạm dừng kịch bản trong khoảng thời gian chỉ định',
    },
    {
      type: 'scratch_repeat',
      message0: 'lặp lại %1 lần 🔄',
      args0: [
        {
          type: 'field_number',
          name: 'TIMES',
          value: 10,
        },
      ],
      message1: '%1',
      args1: [
        {
          type: 'input_statement',
          name: 'SUBSTACK',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.control,
      tooltip: 'Thực hiện các khối lệnh bên trong theo số lần lặp lại',
    },
    {
      type: 'scratch_forever',
      message0: 'liên tục 🔁',
      message1: '%1',
      args1: [
        {
          type: 'input_statement',
          name: 'SUBSTACK',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.control,
      tooltip: 'Lặp lại kịch bản liên tục cho đến khi bấm nút Đỏ dừng lại',
    },
    {
      type: 'scratch_if',
      message0: 'nếu %1 thì ❓',
      args0: [
        {
          type: 'input_value',
          name: 'CONDITION',
          check: 'Boolean',
        },
      ],
      message1: '%1',
      args1: [
        {
          type: 'input_statement',
          name: 'SUBSTACK',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.control,
      tooltip: 'Kiểm tra điều kiện: nếu đúng thì thực hiện các khối lệnh bên trong',
    },
    {
      type: 'scratch_if_else',
      message0: 'nếu %1 thì',
      args0: [
        {
          type: 'input_value',
          name: 'CONDITION',
          check: 'Boolean',
        },
      ],
      message1: '%1',
      args1: [
        {
          type: 'input_statement',
          name: 'SUBSTACK',
        },
      ],
      message2: 'nếu không thì',
      message3: '%1',
      args3: [
        {
          type: 'input_statement',
          name: 'ELSE_SUBSTACK',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.control,
      tooltip: 'Nếu điều kiện đúng thì làm việc 1, ngược lại làm việc 2',
    },

    // ==========================================
    // 6. SENSING (CẢM BIẾN - XANH DƯƠNG NHẠT #5CB1D6)
    // ==========================================
    {
      type: 'scratch_touching_edge',
      message0: 'đang chạm cạnh sân khấu? 🔲',
      output: 'Boolean',
      colour: SCRATCH_COLORS.sensing,
      tooltip: 'Trả về Đúng nếu nhân vật chạm biên sân khấu',
    },
    {
      type: 'scratch_touching_mouse',
      message0: 'đang chạm con trỏ chuột? 🖱️',
      output: 'Boolean',
      colour: SCRATCH_COLORS.sensing,
      tooltip: 'Trả về Đúng nếu nhân vật chạm vị trí con trỏ chuột',
    },

    // ==========================================
    // 7. VARIABLES (BIẾN SỐ - CAM ĐẬM #FF8C1A)
    // ==========================================
    {
      type: 'scratch_set_variable_to',
      message0: 'đặt [ %1 ] thành %2 🔢',
      args0: [
        {
          type: 'field_input',
          name: 'VAR',
          text: 'điểm',
        },
        {
          type: 'field_number',
          name: 'VALUE',
          value: 0,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.variables,
      tooltip: 'Gán giá trị cụ thể cho biến số',
    },
    {
      type: 'scratch_change_variable_by',
      message0: 'thay đổi [ %1 ] một lượng %2 ➕',
      args0: [
        {
          type: 'field_input',
          name: 'VAR',
          text: 'điểm',
        },
        {
          type: 'field_number',
          name: 'CHANGE',
          value: 1,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: SCRATCH_COLORS.variables,
      tooltip: 'Tăng hoặc giảm giá trị hiện tại của biến số',
    },

    // ==========================================
    // 8. OPERATORS (PHÉP TOÁN - XANH LÁ #59C059)
    // ==========================================
    {
      type: 'scratch_random',
      message0: 'lấy ngẫu nhiên từ %1 đến %2 🎲',
      args0: [
        {
          type: 'field_number',
          name: 'FROM',
          value: 1,
        },
        {
          type: 'field_number',
          name: 'TO',
          value: 10,
        },
      ],
      output: 'Number',
      colour: SCRATCH_COLORS.operators,
      tooltip: 'Tạo một số ngẫu nhiên trong khoảng',
    },
  ]);
}

// Cấu hình Toolbox XML danh mục chuẩn Scratch
export const SCRATCH_TOOLBOX_XML = `
<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
  <category name="Chuyển Động" colour="${SCRATCH_COLORS.motion}">
    <block type="scratch_move_steps">
      <field name="STEPS">10</field>
    </block>
    <block type="scratch_turn_right">
      <field name="DEGREES">15</field>
    </block>
    <block type="scratch_turn_left">
      <field name="DEGREES">15</field>
    </block>
    <block type="scratch_goto_xy">
      <field name="X">0</field>
      <field name="Y">0</field>
    </block>
    <block type="scratch_point_direction">
      <field name="DIRECTION">90</field>
    </block>
    <block type="scratch_change_x_by">
      <field name="DX">10</field>
    </block>
    <block type="scratch_change_y_by">
      <field name="DY">10</field>
    </block>
    <block type="scratch_bounce_on_edge"></block>
  </category>

  <category name="Ngoại Hình" colour="${SCRATCH_COLORS.looks}">
    <block type="scratch_say_for_secs">
      <field name="MESSAGE">Xin chào!</field>
      <field name="SECS">2</field>
    </block>
    <block type="scratch_say">
      <field name="MESSAGE">Xin chào!</field>
    </block>
    <block type="scratch_change_size_by">
      <field name="CHANGE">10</field>
    </block>
    <block type="scratch_set_size_to">
      <field name="SIZE">100</field>
    </block>
    <block type="scratch_show"></block>
    <block type="scratch_hide"></block>
  </category>

  <category name="Âm Thanh" colour="${SCRATCH_COLORS.sound}">
    <block type="scratch_play_sound_meow"></block>
    <block type="scratch_play_drum">
      <field name="DRUM">1</field>
      <field name="SECS">0.25</field>
    </block>
  </category>

  <category name="Sự Kiện" colour="${SCRATCH_COLORS.events}">
    <block type="scratch_when_flag_clicked"></block>
    <block type="scratch_when_sprite_clicked"></block>
    <block type="scratch_when_key_pressed"></block>
    <block type="scratch_broadcast_message"></block>
    <block type="scratch_when_receive_message"></block>
  </category>

  <category name="Điều Khiển" colour="${SCRATCH_COLORS.control}">
    <block type="scratch_wait_secs">
      <field name="SECS">1</field>
    </block>
    <block type="scratch_repeat">
      <field name="TIMES">10</field>
    </block>
    <block type="scratch_forever"></block>
    <block type="scratch_if"></block>
    <block type="scratch_if_else"></block>
  </category>

  <category name="Cảm Biến" colour="${SCRATCH_COLORS.sensing}">
    <block type="scratch_touching_edge"></block>
    <block type="scratch_touching_mouse"></block>
  </category>

  <category name="Biến Số" colour="${SCRATCH_COLORS.variables}">
    <block type="scratch_set_variable_to">
      <field name="VAR">điểm</field>
      <field name="VALUE">0</field>
    </block>
    <block type="scratch_change_variable_by">
      <field name="VAR">điểm</field>
      <field name="CHANGE">1</field>
    </block>
  </category>

  <category name="Phép Toán" colour="${SCRATCH_COLORS.operators}">
    <block type="scratch_random">
      <field name="FROM">1</field>
      <field name="TO">10</field>
    </block>
  </category>
</xml>
`;

// Tạo kịch bản mẫu ban đầu (Starter script)
export const STARTER_FLAG_SCRIPT_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="scratch_when_flag_clicked" x="40" y="40">
    <next>
      <block type="scratch_say_for_secs">
        <field name="MESSAGE">Xin chào các bạn!</field>
        <field name="SECS">2</field>
        <next>
          <block type="scratch_move_steps">
            <field name="STEPS">30</field>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>
`;
