import pytest
from app.game_evaluator import evaluate_game_answer

def test_evaluator_quiz():
    q_data = {"question": "2 + 2 = ?", "options": ["3", "4", "5"], "answer": "4"}
    
    # Dung
    res = evaluate_game_answer("quiz", q_data, {"selectedOption": "4"}, 25)
    assert res.is_correct is True
    assert res.score == 25
    assert res.stars == 3

    # Sai
    res_wrong = evaluate_game_answer("quiz", q_data, {"selectedOption": "3"}, 25)
    assert res_wrong.is_correct is False
    assert res_wrong.score == 0

    # Prefix match ("B" match "B. Cat")
    q_data_prefix = {"question": "Con mèo tiếng Anh là gì?", "options": ["A. Dog", "B. Cat", "C. Fish"], "answer": "B. Cat"}
    res_prefix = evaluate_game_answer("quiz", q_data_prefix, {"selectedOption": "B"}, 25)
    assert res_prefix.is_correct is True

def test_evaluator_matching():
    q_data = {
        "pairs": [
            {"left": "Cat", "right": "Mèo"},
            {"left": "Dog", "right": "Chó"},
        ]
    }
    # Đúng
    res = evaluate_game_answer("matching", q_data, {"pairs": [{"left": "Cat", "right": "Mèo"}, {"left": "Dog", "right": "Chó"}]})
    assert res.is_correct is True
    assert res.stars == 3

    # Thiếu / Sai cặp
    res_wrong = evaluate_game_answer("matching", q_data, {"pairs": [{"left": "Cat", "right": "Chó"}]})
    assert res_wrong.is_correct is False

def test_evaluator_sequence():
    q_data = {"sequence": ["2", "4", "6", "?"], "answer": "8"}
    # Đúng
    res = evaluate_game_answer("sequence", q_data, {"answer": "8"})
    assert res.is_correct is True

    # Sai
    res_wrong = evaluate_game_answer("sequence", q_data, {"answer": "7"})
    assert res_wrong.is_correct is False

def test_evaluator_memory():
    q_data = {"items": ["🐶", "🐱", "🐰", "🐼"]}
    # Đủ pairs và đủ số lượt lật
    res = evaluate_game_answer("memory", q_data, {"completed": True, "matchesCount": 4, "flipsCount": 8})
    assert res.is_correct is True
    assert res.stars == 3

    # Chưa lật hết thẻ
    res_incomplete = evaluate_game_answer("memory", q_data, {"completed": False, "matchesCount": 2, "flipsCount": 4})
    assert res_incomplete.is_correct is False

def test_evaluator_flashcard():
    q_data = {"cards": [{"front": "Hello", "back": "Xin chào"}, {"front": "Goodbye", "back": "Tạm biệt"}]}
    res = evaluate_game_answer("flashcard", q_data, {"completed": True, "cardsViewed": 2})
    assert res.is_correct is True

    res_few = evaluate_game_answer("flashcard", q_data, {"completed": False, "cardsViewed": 1})
    assert res_few.is_correct is False

def test_evaluator_language():
    # unscramble
    q_data = {"correct_order": ["the", "cat", "is", "cute"], "type": "unscramble"}
    res = evaluate_game_answer("language", q_data, {"tokens": ["the", "cat", "is", "cute"]})
    assert res.is_correct is True

    # fill_blank
    q_data_blank = {"sentence": "I ___ an apple", "answer": "eat", "type": "fill_blank"}
    res_blank = evaluate_game_answer("language", q_data_blank, {"answer": "Eat "})
    assert res_blank.is_correct is True

def test_evaluator_observation():
    # Theo tọa độ row / col
    q_data_coord = {
        "grid": [["🍎", "🍎"], ["🍎", "🍊"]],
        "target_row": 1,
        "target_col": 1,
    }
    res_coord = evaluate_game_answer("observation", q_data_coord, {"row": 1, "col": 1})
    assert res_coord.is_correct is True

    # Theo answer value
    q_data_val = {
        "grid": [["🍎", "🍎"], ["🍎", "🍊"]],
        "answer": "🍊",
    }
    res_val = evaluate_game_answer("observation", q_data_val, {"answer": "🍊"})
    assert res_val.is_correct is True

    res_wrong = evaluate_game_answer("observation", q_data_val, {"answer": "🍎"})
    assert res_wrong.is_correct is False

def test_evaluator_sorting():
    q_data = {
        "items": [
            {"id": "1", "name": "Bé nhất"},
            {"id": "2", "name": "Vừa"},
            {"id": "3", "name": "Lớn nhất"},
        ],
        "correct_sequence_ids": ["1", "2", "3"],
    }
    res = evaluate_game_answer("sorting", q_data, {"sequence": ["1", "2", "3"]})
    assert res.is_correct is True

    res_wrong = evaluate_game_answer("sorting", q_data, {"sequence": ["2", "1", "3"]})
    assert res_wrong.is_correct is False

def test_evaluator_math():
    q_data = {"num1": 15, "num2": 25, "operator": "+", "answer": "40"}
    res = evaluate_game_answer("math", q_data, {"answer": 40})
    assert res.is_correct is True

    res_wrong = evaluate_game_answer("math", q_data, {"answer": "35"})
    assert res_wrong.is_correct is False

def test_evaluator_logic_grid():
    q_data = {"options": ["A", "B", "C"], "answer": "B"}
    res = evaluate_game_answer("logic_grid", q_data, {"answer": "B"})
    assert res.is_correct is True

    res_wrong = evaluate_game_answer("logic_grid", q_data, {"answer": "A"})
    assert res_wrong.is_correct is False

def test_evaluator_coding():
    q_data = {"options": ["step()", "turn_right()"], "answer": "step()"}
    res = evaluate_game_answer("coding", q_data, {"answer": "step()"})
    assert res.is_correct is True

    res_wrong = evaluate_game_answer("coding", q_data, {"answer": "turn_right()"})
    assert res_wrong.is_correct is False

def test_evaluator_scratch():
    q_data = {"target_block_sequence": "move_up,move_right,collect_star"}
    res = evaluate_game_answer("scratch", q_data, {"sequence": ["move_up", "move_right", "collect_star"]})
    assert res.is_correct is True

    res_wrong = evaluate_game_answer("scratch", q_data, {"sequence": ["move_down"]})
    assert res_wrong.is_correct is False

def test_evaluator_edge_cases():
    # Null submittedAnswer
    res_none = evaluate_game_answer("quiz", {"answer": "A"}, None)
    assert res_none.is_correct is False
    assert res_none.score == 0

    # Malformed / empty data
    res_empty = evaluate_game_answer("quiz", {}, {"selectedOption": "A"})
    assert res_empty.is_correct is False