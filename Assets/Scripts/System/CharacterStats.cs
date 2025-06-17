using UnityEngine;

public enum CharacterClass { Elf, Knight, Wizard }

[System.Serializable]
public class CharacterStats
{
    public int HP = 100;
    public float AttackSpeed = 1.0f;
    public float MoveSpeed = 3.0f;
    public int Level = 1;
    public CharacterClass ClassType;

    public void LevelUp()
    {
        Level++;
        if (Level % 10 == 0) TransformIntoBeast();
    }

    void TransformIntoBeast()
    {
        AttackSpeed += Random.Range(0.2f, 0.5f);
        MoveSpeed += Random.Range(0.2f, 0.5f);
    }
}
