const { extractJSON } = require("../utils/parser");

describe("extractJSON Helper", () => {
  test("parses a standard JSON array string", () => {
    const input = '[{"title":"Hackathon","date":"2026-11-01"}]';
    const result = extractJSON(input);
    expect(result).toEqual([{ title: "Hackathon", date: "2026-11-01" }]);
  });

  test("parses a standard JSON object string", () => {
    const input = '{"title":"Guest Lecture","category":"Academic"}';
    const result = extractJSON(input);
    expect(result).toEqual({ title: "Guest Lecture", category: "Academic" });
  });

  test("strips markdown code fences (```json ... ```)", () => {
    const input = "```json\n[{\"title\":\"Football Match\",\"category\":\"Sports\"}]\n```";
    const result = extractJSON(input);
    expect(result).toEqual([{ title: "Football Match", category: "Sports" }]);
  });

  test("extracts JSON embedded with conversational preamble and postamble", () => {
    const input = 'Here are the events I found:\n[{"title":"Workshop","venue":"Lab 2"}]\nHope this helps!';
    const result = extractJSON(input);
    expect(result).toEqual([{ title: "Workshop", venue: "Lab 2" }]);
  });

  test("throws error when input is empty, null, or whitespace", () => {
    expect(() => extractJSON("")).toThrow("non-empty string");
    expect(() => extractJSON("   ")).toThrow("non-empty string");
    expect(() => extractJSON(null)).toThrow("non-empty string");
  });

  test("throws error when no JSON structure can be found", () => {
    expect(() => extractJSON("There are no events mentioned here.")).toThrow(
      "No JSON structure found"
    );
  });
});

